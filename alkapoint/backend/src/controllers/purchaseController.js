const {
  Purchase, PurchaseItem, ProductVariant, Supplier,
  InventoryBatch, StockMovement, sequelize,
} = require('../models');
const { generatePurchaseRef, round2 } = require('../utils/helpers');
const audit = require('../services/auditService');

exports.createPurchase = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { supplierId, purchaseDate, items = [], transportCost = 0, otherCosts = 0, notes = '', paidAmount = 0 } = req.body;
    if (!items.length) { await t.rollback(); return res.status(400).json({ message: 'At least one item required' }); }

    const transport = round2(Number(transportCost) || 0);
    const other = round2(Number(otherCosts) || 0);
    const extraTotal = transport + other;

    let subtotal = 0;
    const preparedItems = items.map((i) => {
      const qty = parseInt(i.quantity);
      const unitCost = round2(Number(i.unitCost));
      const total = round2(qty * unitCost);
      subtotal += total;
      return { ...i, quantity: qty, unitCost, total };
    });

    const totalCost = round2(subtotal + extraTotal);

    const purchase = await Purchase.create({
      businessId: req.businessId, branchId: req.user.branchId,
      supplierId: supplierId || null, reference: generatePurchaseRef(),
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      subtotal: round2(subtotal), transportCost: transport, otherCosts: other,
      totalCost, amountPaid: round2(Number(paidAmount) || 0),
      paymentStatus: paidAmount >= totalCost ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid'),
      notes, createdBy: req.user.id,
    }, { transaction: t });

    for (const it of preparedItems) {
      const share = subtotal > 0 ? it.total / subtotal : 1 / preparedItems.length;
      const allocatedTransport = round2(transport * share);
      const allocatedOther = round2(other * share);
      const finalUnitCost = round2(it.unitCost + (allocatedTransport + allocatedOther) / it.quantity);

      const pi = await PurchaseItem.create({
        purchaseId: purchase.id, variantId: it.variantId,
        quantity: it.quantity, unitCost: it.unitCost, totalCost: it.total,
        allocatedTransport, allocatedOther, finalUnitCost,
      }, { transaction: t });

      const batch = await InventoryBatch.create({
        businessId: req.businessId, branchId: req.user.branchId,
        variantId: it.variantId, purchaseItemId: pi.id,
        batchRef: `${purchase.reference}-${pi.id.slice(0, 6)}`,
        quantityReceived: it.quantity, quantityRemaining: it.quantity,
        costPerUnit: finalUnitCost, receivedAt: new Date(),
      }, { transaction: t });

      await StockMovement.create({
        businessId: req.businessId, branchId: req.user.branchId,
        variantId: it.variantId, batchId: batch.id, type: 'purchase',
        quantity: it.quantity, referenceId: purchase.id,
        previousQty: 0, newQty: it.quantity, createdBy: req.user.id,
      }, { transaction: t });
    }

    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'PURCHASE_CREATED', entity: 'Purchase', entityId: purchase.id, req });

    const full = await Purchase.findByPk(purchase.id, {
      include: [{ model: PurchaseItem, as: 'items' }, { model: Supplier, as: 'supplier' }],
    });
    res.status(201).json(full);
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

exports.listPurchases = async (req, res, next) => {
  try {
    const { startDate, endDate, supplierId, status } = req.query;
    const where = { businessId: req.businessId };
    if (startDate) where.purchaseDate = { [Op.gte]: new Date(startDate) };
    if (endDate) where.purchaseDate = { ...(where.purchaseDate || {}), [Op.lte]: new Date(endDate) };
    if (supplierId) where.supplierId = supplierId;
    if (status) where.paymentStatus = status;

    const purchases = await Purchase.findAll({
      where,
      include: [
        { model: PurchaseItem, as: 'items' },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
      ],
      order: [['purchaseDate', 'DESC']],
      limit: 200,
    });

    res.json(purchases.map((p) => {
      const plain = p.toJSON();
      plain.outstanding = Number(
        (Number(plain.totalCost) - Number(plain.amountPaid || 0)).toFixed(2)
      );
      return plain;
    }));
  } catch (err) { next(err); }
};

exports.getPurchase = async (req, res, next) => {
  try {
    const p = await Purchase.findOne({
      where: { id: req.params.id, businessId: req.businessId },
      include: [
        { model: PurchaseItem, as: 'items', include: [{ model: ProductVariant, as: 'variant' }] },
        { model: Supplier, as: 'supplier' },
      ],
    });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (err) { next(err); }
};

exports.listSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.findAll({ where: { businessId: req.businessId } });
    res.json(suppliers);
  } catch (err) { next(err); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create({ businessId: req.businessId, ...req.body });
    res.status(201).json(supplier);
  } catch (err) { next(err); }
};