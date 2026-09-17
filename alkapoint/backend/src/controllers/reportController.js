const { Sale, SaleItem, Expense, sequelize } = require('../models');
const { buildDateFilter } = require('../utils/helpers');

exports.salesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate, 'saleDate');
    const where = { businessId: req.businessId, status: 'completed', ...dateFilter };

    const sales = await Sale.findAll({
      where,
      include: [{ model: SaleItem, as: 'items' }],
      order: [['saleDate', 'ASC']],
    });

    let revenue = 0, cost = 0, profit = 0, discount = 0, tax = 0;
    const groups = {};

    for (const s of sales) {
      revenue += Number(s.total);
      cost += Number(s.totalCost);
      profit += Number(s.grossProfit);
      discount += Number(s.discount);
      tax += Number(s.tax);

      const d = new Date(s.saleDate);
      let key;
      if (groupBy === 'day') key = d.toISOString().slice(0, 10);
      else if (groupBy === 'month') key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      else if (groupBy === 'year') key = String(d.getFullYear());
      else key = 'total';

      if (!groups[key]) groups[key] = { key, revenue: 0, cost: 0, profit: 0, orders: 0 };
      groups[key].revenue += Number(s.total);
      groups[key].cost += Number(s.totalCost);
      groups[key].profit += Number(s.grossProfit);
      groups[key].orders += 1;
    }

    res.json({
      summary: {
        revenue, cost, profit, discount, tax, orders: sales.length,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      },
      groups: Object.values(groups),
    });
  } catch (err) { next(err); }
};

exports.profitLoss = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate, 'saleDate');

    const sales = await Sale.findAll({
      where: { businessId: req.businessId, status: 'completed', ...dateFilter },
      attributes: ['total', 'totalCost', 'grossProfit', 'discount', 'tax'],
    });

    const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
    const cogs = sales.reduce((s, x) => s + Number(x.totalCost), 0);
    const grossProfit = revenue - cogs;
    const discounts = sales.reduce((s, x) => s + Number(x.discount), 0);
    const taxes = sales.reduce((s, x) => s + Number(x.tax), 0);

    const expDateFilter = buildDateFilter(startDate, endDate, 'expenseDate');
    const expenses = await Expense.findAll({ where: { businessId: req.businessId, ...expDateFilter } });
    const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount), 0);

    const netProfit = grossProfit - expenseTotal;

    const expenseByCat = await sequelize.query(`
      SELECT ec.name AS category, SUM(e.amount) AS total
      FROM expenses e
      JOIN expense_categories ec ON ec.id = e."categoryId"
      WHERE e."businessId" = :businessId
        ${startDate ? 'AND e."expenseDate" >= :startDate' : ''}
        ${endDate ? 'AND e."expenseDate" <= :endDate' : ''}
      GROUP BY ec.name
      ORDER BY total DESC
    `, {
      replacements: {
        businessId: req.businessId,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
      type: sequelize.QueryTypes.SELECT,
    });

    res.json({
      revenue, cogs, grossProfit, discounts, taxes, expenses: expenseTotal, netProfit,
      expenseBreakdown: expenseByCat.map((r) => ({ category: r.category, total: Number(r.total) })),
    });
  } catch (err) { next(err); }
};

exports.inventoryValuation = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT p.name AS product, pv.name AS variant,
        SUM(ib."quantityRemaining") AS qty,
        AVG(ib."costPerUnit") AS avg_cost,
        SUM(ib."quantityRemaining" * ib."costPerUnit") AS value
      FROM inventory_batches ib
      JOIN product_variants pv ON pv.id = ib."variantId"
      JOIN products p ON p.id = pv."productId"
      WHERE ib."businessId" = :businessId
      GROUP BY p.name, pv.name
      HAVING SUM(ib."quantityRemaining") > 0
      ORDER BY value DESC
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    const totalValue = rows.reduce((s, r) => s + Number(r.value), 0);
    res.json({
      totalValue,
      items: rows.map((r) => ({
        product: r.product, variant: r.variant,
        quantity: Number(r.qty), avgCost: Number(r.avg_cost), value: Number(r.value),
      })),
    });
  } catch (err) { next(err); }
};

exports.customerReport = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT c.id, c.name, c.phone,
        COUNT(s.id) AS orders,
        COALESCE(SUM(s.total), 0) AS spent,
        COALESCE(c.balance, 0) AS outstanding
      FROM customers c
      LEFT JOIN sales s ON s."customerId" = c.id AND s.status = 'completed'
      WHERE c."businessId" = :businessId
      GROUP BY c.id, c.name, c.phone, c.balance
      ORDER BY spent DESC
      LIMIT 100
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    res.json(rows.map((r) => ({
      id: r.id, name: r.name, phone: r.phone,
      orders: Number(r.orders), spent: Number(r.spent), outstanding: Number(r.outstanding),
    })));
  } catch (err) { next(err); }
};