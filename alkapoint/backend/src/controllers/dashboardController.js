const {
  Sale, Customer, Expense, ProductVariant, Product,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');

exports.getSummary = async (req, res, next) => {
  try {
    const businessId = req.businessId;
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const safe = async (fn, fallback = 0) => {
      try { const v = await fn(); return v ?? fallback; }
      catch (e) { console.error('[dashboard] query failed:', e.message); return fallback; }
    };

    const todaySales = await safe(() => Sale.sum('total', { where: { businessId, saleDate: { [Op.between]: [todayStart, todayEnd] }, status: 'completed' } }));
    const todayCount = await safe(() => Sale.count({ where: { businessId, saleDate: { [Op.between]: [todayStart, todayEnd] }, status: 'completed' } }));
    const todayCost = await safe(() => Sale.sum('totalCost', { where: { businessId, saleDate: { [Op.between]: [todayStart, todayEnd] }, status: 'completed' } }));
    const yesterdaySales = await safe(() => Sale.sum('total', { where: { businessId, saleDate: { [Op.between]: [yesterdayStart, yesterdayEnd] }, status: 'completed' } }));
    const monthSales = await safe(() => Sale.sum('total', { where: { businessId, saleDate: { [Op.gte]: monthStart }, status: 'completed' } }));
    const monthCost = await safe(() => Sale.sum('totalCost', { where: { businessId, saleDate: { [Op.gte]: monthStart }, status: 'completed' } }));
    const totalRevenue = await safe(() => Sale.sum('total', { where: { businessId, status: 'completed' } }));
    const totalCost = await safe(() => Sale.sum('totalCost', { where: { businessId, status: 'completed' } }));
    const outstandingDebt = await safe(() => Customer.sum('balance', { where: { businessId } }));
    const monthExpenses = await safe(() => Expense.sum('amount', { where: { businessId, expenseDate: { [Op.gte]: monthStart } } }));
    const totalCustomers = await safe(() => Customer.count({ where: { businessId, isActive: true } }));

    const productCount = await safe(async () => {
      const rows = await sequelize.query(
        `SELECT COUNT(DISTINCT pv.id) AS c
         FROM product_variants pv
         JOIN products p ON p.id = pv."productId"
         WHERE p."businessId" = :businessId
           AND pv."deletedAt" IS NULL AND p."deletedAt" IS NULL`,
        { replacements: { businessId }, type: sequelize.QueryTypes.SELECT }
      );
      return Number(rows[0]?.c || 0);
    }, 0);

    const lowStockRows = await safe(async () => {
      return sequelize.query(`
        SELECT pv.id, pv.name AS variant_name, p.name AS product_name, pv."reorderLevel",
          COALESCE(SUM(ib."quantityRemaining"), 0) AS stock
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        LEFT JOIN inventory_batches ib ON ib."variantId" = pv.id
        WHERE p."businessId" = :businessId AND pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
        GROUP BY pv.id, pv.name, p.name, pv."reorderLevel"
        HAVING COALESCE(SUM(ib."quantityRemaining"), 0) < pv."reorderLevel"
        LIMIT 50
      `, { replacements: { businessId }, type: sequelize.QueryTypes.SELECT });
    }, []);

    const inventoryValue = await safe(async () => {
      const rows = await sequelize.query(
        `SELECT COALESCE(SUM(ib."quantityRemaining" * ib."costPerUnit"), 0) AS value
         FROM inventory_batches ib WHERE ib."businessId" = :businessId`,
        { replacements: { businessId }, type: sequelize.QueryTypes.SELECT }
      );
      return Number(rows[0]?.value || 0);
    }, 0);

    const todayProfit = Number(todaySales || 0) - Number(todayCost || 0);
    const monthProfit = Number(monthSales || 0) - Number(monthCost || 0);
    const totalProfit = Number(totalRevenue || 0) - Number(totalCost || 0);
    const netProfitMonth = monthProfit - Number(monthExpenses || 0);

    const growthPct = yesterdaySales && yesterdaySales > 0
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
      : null;

    res.json({
      currency: req.user?.Business?.currency || 'KES',
      today: {
        sales: Number(todaySales || 0),
        count: Number(todayCount || 0),
        profit: todayProfit,
        growthPct: growthPct !== null ? Number(growthPct.toFixed(2)) : null,
      },
      month: {
        sales: Number(monthSales || 0),
        profit: monthProfit,
        expenses: Number(monthExpenses || 0),
        netProfit: netProfitMonth,
      },
      totals: {
        revenue: Number(totalRevenue || 0),
        cost: Number(totalCost || 0),
        profit: totalProfit,
        customers: Number(totalCustomers || 0),
        products: productCount,
        outstandingDebt: Number(outstandingDebt || 0),
        inventoryValue,
      },
      lowStock: (lowStockRows || []).map((r) => ({
        id: r.id,
        name: `${r.product_name} — ${r.variant_name}`,
        stock: Number(r.stock),
        reorderLevel: Number(r.reorderLevel),
      })),
    });
  } catch (err) {
    console.error('[dashboard/summary] fatal:', err);
    next(err);
  }
};

exports.getSalesTrend = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;

    const rows = await sequelize.query(`
      SELECT DATE("saleDate") AS date,
        SUM(total) AS revenue, SUM("totalCost") AS cost,
        SUM("grossProfit") AS profit, COUNT(*) AS orders
      FROM sales
      WHERE "businessId" = :businessId AND status = 'completed'
        AND "saleDate" >= NOW() - (:days || ' days')::interval
      GROUP BY DATE("saleDate")
      ORDER BY DATE("saleDate") ASC
    `, { replacements: { businessId: req.businessId, days: String(days) }, type: sequelize.QueryTypes.SELECT });

    res.json(rows.map((r) => ({
      date: r.date, revenue: Number(r.revenue), cost: Number(r.cost),
      profit: Number(r.profit), orders: Number(r.orders),
    })));
  } catch (err) {
    console.error('[dashboard/sales-trend]', err);
    next(err);
  }
};

exports.getPaymentBreakdown = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT method, SUM(amount) AS total
      FROM payments
      WHERE "businessId" = :businessId AND status = 'completed'
        AND "paymentDate" >= NOW() - INTERVAL '30 days'
      GROUP BY method
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    res.json(rows.map((r) => ({
      method: r.method,
      total: Number(r.total),
      percentage: total > 0 ? Number(((r.total / total) * 100).toFixed(1)) : 0,
    })));
  } catch (err) {
    console.error('[dashboard/payment-breakdown]', err);
    next(err);
  }
};

exports.getTopProducts = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT si."variantId" AS variant_id, si."productName" AS product,
        si."variantName" AS variant, SUM(si.quantity) AS units,
        SUM(si.subtotal) AS revenue, SUM(si.profit) AS profit
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      WHERE s."businessId" = :businessId AND s.status = 'completed'
        AND s."saleDate" >= NOW() - INTERVAL '30 days'
      GROUP BY si."variantId", si."productName", si."variantName"
      ORDER BY units DESC LIMIT 10
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    res.json(rows.map((r) => ({
      variantId: r.variant_id, product: r.product, variant: r.variant,
      units: Number(r.units), revenue: Number(r.revenue), profit: Number(r.profit),
    })));
  } catch (err) {
    console.error('[dashboard/top-products]', err);
    next(err);
  }
};

exports.getRecentActivity = async (req, res, next) => {
  try {
    const sales = await Sale.findAll({
      where: { businessId: req.businessId },
      order: [['saleDate', 'DESC']],
      limit: 10,
      include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
    });
    res.json(sales.map((s) => ({
      id: s.id, invoiceNumber: s.invoiceNumber, total: Number(s.total),
      date: s.saleDate, customer: s.customer?.name || 'Walk-in', status: s.status,
    })));
  } catch (err) {
    console.error('[dashboard/recent-activity]', err);
    next(err);
  }
};