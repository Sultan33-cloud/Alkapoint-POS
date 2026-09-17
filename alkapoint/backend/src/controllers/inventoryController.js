const { InventoryBatch, StockMovement, ProductVariant, Product, Branch, sequelize } = require('../models');
const { Op } = require('sequelize');
const { adjustStock } = require('../services/inventoryService');
const audit = require('../services/auditService');

exports.listBatches = async (req, res, next) => {
  try {
    const { branchId, variantId, lowStockOnly } = req.query;
    const where = { businessId: req.businessId };
    if (branchId) where.branchId = branchId;
    if (variantId) where.variantId = variantId;
    if (lowStockOnly === 'true') where.quantityRemaining = { [Op.gt]: 0 };

    const batches = await InventoryBatch.findAll({
      where,
      include: [
        { model: ProductVariant, as: 'variant', include: [{ model: Product, as: 'product' }] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
      ],
      order: [['receivedAt', 'DESC']],
      limit: 500,
    });
    res.json(batches);
  } catch (err) { next(err); }
};

exports.stockSummary = async (req, res, next) => {
  try {
    const rows = await sequelize.query(`
      SELECT pv.id AS variant_id, pv.name AS variant_name,
             p.id AS product_id, p.name AS product_name,
             pv."sellingPrice" AS selling_price, pv."costPrice" AS cost_price,
             pv."reorderLevel" AS reorder_level,
             COALESCE(SUM(ib."quantityRemaining"), 0) AS stock,
             COALESCE(SUM(ib."quantityRemaining" * ib."costPerUnit"), 0) AS stock_value
      FROM product_variants pv
      JOIN products p ON p.id = pv."productId"
      LEFT JOIN inventory_batches ib ON ib."variantId" = pv.id
      WHERE p."businessId" = :businessId
        AND pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
      GROUP BY pv.id, pv.name, p.id, p.name, pv."sellingPrice", pv."costPrice", pv."reorderLevel"
      ORDER BY stock ASC
    `, { replacements: { businessId: req.businessId }, type: sequelize.QueryTypes.SELECT });

    res.json(rows.map((r) => ({
      variantId: r.variant_id,
      variantName: r.variant_name,
      productId: r.product_id,
      productName: r.product_name,
      sellingPrice: Number(r.selling_price),
      costPrice: Number(r.cost_price),
      reorderLevel: Number(r.reorder_level),
      stock: Number(r.stock),
      stockValue: Number(r.stock_value),
      isLow: Number(r.stock) <= Number(r.reorder_level),
      isOut: Number(r.stock) === 0,
    })));
  } catch (err) { next(err); }
};

exports.adjust = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { variantId, newQuantity, reason } = req.body;
    await adjustStock({
      businessId: req.businessId,
      branchId: req.user.branchId,
      variantId,
      newQuantity: Number(newQuantity),
      reason: reason || 'Manual adjustment',
      userId: req.user.id,
      transaction: t,
    });
    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'STOCK_ADJUST', entity: 'ProductVariant', entityId: variantId, newValues: { newQuantity, reason }, req });
    res.json({ message: 'Stock adjusted' });
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

exports.movements = async (req, res, next) => {
  try {
    const { variantId, type, limit = 100 } = req.query;
    const where = { businessId: req.businessId };
    if (variantId) where.variantId = variantId;
    if (type) where.type = type;

    const movements = await StockMovement.findAll({
      where,
      include: [{ model: ProductVariant, as: 'variant', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
    });
    res.json(movements);
  } catch (err) { next(err); }
};