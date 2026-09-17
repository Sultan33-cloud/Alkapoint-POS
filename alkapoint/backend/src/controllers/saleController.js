const {
  Sale, SaleItem, Payment, CreditTransaction,
  Customer, ProductVariant, Product, InventoryBatch,
  StockMovement, sequelize,
} = require('../models');
const { Op } = require('sequelize');
const { deductFIFO } = require('../services/inventoryService');
const { generateInvoiceNumber, round2 } = require('../utils/helpers');
const audit = require('../services/auditService');

exports.createSale = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { items, customerId, payments = [], isCredit = false, dueDate = null, discount = 0, notes = '' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'At least one item required' });
    }

    const branchId = req.user.branchId;
    const businessId = req.businessId;

    if (isCredit && !customerId) {
      await t.rollback();
      return res.status(400).json({ message: 'Customer required for credit sales' });
    }

    let subtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const variant = await ProductVariant.findByPk(item.variantId, { include: [{ model: Product }], transaction: t });
      if (!variant || !variant.isActive) {
        await t.rollback();
        return res.status(400).json({ message: `Variant ${item.variantId} not available` });
      }
      const qty = parseInt(item.quantity);
      if (!qty || qty <= 0) {
        await t.rollback();
        return res.status(400).json({ message: 'Invalid quantity' });
      }

      const stock = await InventoryBatch.sum('quantityRemaining', {
        where: { variantId: variant.id, branchId, businessId }, transaction: t,
      });
      if ((stock || 0) < qty) {
        await t.rollback();
        return res.status(400).json({ message: `Insufficient stock for ${variant.Product.name} — ${variant.name}. Available: ${stock || 0}` });
      }

      const unitPrice = Number(variant.sellingPrice);
      const lineSubtotal = round2(unitPrice * qty);
      subtotal += lineSubtotal;
      preparedItems.push({ variant, quantity: qty, unitPrice, subtotal: lineSubtotal });
    }

    const discountAmt = round2(Number(discount) || 0);
    const taxableBase = Math.max(0, subtotal - discountAmt);
    const taxRate = Number(req.user.Business?.taxRate || 0);
    const tax = round2(taxableBase * (taxRate / 100));
    const total = round2(taxableBase + tax);

    const invoiceNumber = generateInvoiceNumber('INV');
    const sale = await Sale.create({
      businessId, branchId, customerId: customerId || null, invoiceNumber,
      saleDate: new Date(),
      subtotal: round2(subtotal), discount: discountAmt, tax, total,
      amountPaid: 0, balance: total, totalCost: 0, grossProfit: 0,
      isCredit: !!isCredit, dueDate: isCredit ? dueDate : null,
      status: isCredit ? 'pending' : 'completed',
      notes, createdBy: req.user.id,
    }, { transaction: t });

    let totalCost = 0;
    for (const pi of preparedItems) {
      const { totalCost: lineCost, avgCost } = await deductFIFO({
        businessId, branchId, variantId: pi.variant.id, quantity: pi.quantity,
        referenceId: sale.id, type: 'sale', userId: req.user.id, transaction: t,
      });
      totalCost += lineCost;

      await SaleItem.create({
        saleId: sale.id, variantId: pi.variant.id,
        productName: pi.variant.Product.name, variantName: pi.variant.name,
        quantity: pi.quantity, unitPrice: pi.unitPrice, unitCost: round2(avgCost),
        subtotal: pi.subtotal, profit: round2(pi.subtotal - lineCost),
      }, { transaction: t });
    }

    let amountPaid = 0;
    for (const p of payments) {
      const amt = round2(Number(p.amount) || 0);
      if (amt <= 0) continue;
      await Payment.create({
        businessId, branchId, saleId: sale.id, customerId: customerId || null,
        type: 'sale', method: p.method || 'cash', amount: amt,
        reference: p.reference || null, phoneNumber: p.phoneNumber || null,
        transactionId: p.transactionId || null, status: 'completed', createdBy: req.user.id,
      }, { transaction: t });
      amountPaid += amt;
    }

    const balance = round2(Math.max(0, total - amountPaid));
    const grossProfit = round2(subtotal - discountAmt - totalCost);

    await sale.update({
      amountPaid: round2(amountPaid), balance,
      totalCost: round2(totalCost), grossProfit,
      status: balance === 0 ? 'completed' : (isCredit ? 'pending' : 'completed'),
    }, { transaction: t });

    if (customerId) {
      const customer = await Customer.findOne({
        where: { id: customerId, businessId }, transaction: t, lock: t.LOCK.UPDATE,
      });
      if (customer) {
        const newBalance = round2(Number(customer.balance) + balance);
        await customer.update({ balance: newBalance }, { transaction: t });
      }
      if (isCredit && balance > 0) {
        await CreditTransaction.create({
          businessId, customerId, saleId: sale.id, type: 'debit',
          amount: balance, balance, dueDate,
          description: `Credit sale ${invoiceNumber}`,
        }, { transaction: t });
      }
    }

    await t.commit();
    await audit.log({ businessId, userId: req.user.id, action: 'SALE_CREATED', entity: 'Sale', entityId: sale.id, newValues: { invoiceNumber, total, balance }, req });

    const full = await Sale.findByPk(sale.id, {
      include: [
        { model: SaleItem, as: 'items' },
        { model: Payment, as: 'payments' },
        { model: Customer, as: 'customer' },
      ],
    });
    res.status(201).json(full);
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

exports.listSales = async (req, res, next) => {
  try {
    const { startDate, endDate, customerId, status, page = 1, limit = 20 } = req.query;
    const where = { businessId: req.businessId };
    if (startDate) where.saleDate = { [Op.gte]: new Date(startDate) };
    if (endDate) where.saleDate = { ...(where.saleDate || {}), [Op.lte]: new Date(endDate) };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const offset = (page - 1) * limit;
    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: SaleItem, as: 'items' },
        { model: Payment, as: 'payments' },
      ],
      order: [['saleDate', 'DESC']],
      limit: Number(limit), offset,
    });
    res.json({ total: count, page: Number(page), limit: Number(limit), sales: rows });
  } catch (err) { next(err); }
};

exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.id, businessId: req.businessId },
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items' },
        { model: Payment, as: 'payments' },
      ],
    });
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { next(err); }
};

exports.cancelSale = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findOne({
      where: { id: req.params.id, businessId: req.businessId },
      include: [{ model: SaleItem, as: 'items' }],
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!sale) { await t.rollback(); return res.status(404).json({ message: 'Not found' }); }
    if (sale.status === 'cancelled') { await t.rollback(); return res.status(400).json({ message: 'Already cancelled' }); }

    for (const item of sale.items) {
      await InventoryBatch.create({
        businessId: req.businessId, branchId: sale.branchId,
        variantId: item.variantId,
        quantityReceived: item.quantity, quantityRemaining: item.quantity,
        costPerUnit: item.unitCost, batchRef: `RET-${sale.invoiceNumber}`,
        receivedAt: new Date(),
      }, { transaction: t });

      await StockMovement.create({
        businessId: req.businessId, branchId: sale.branchId,
        variantId: item.variantId, type: 'return', quantity: item.quantity,
        referenceId: sale.id, createdBy: req.user.id,
      }, { transaction: t });
    }

    if (sale.isCredit && sale.customerId && Number(sale.balance) > 0) {
      const customer = await Customer.findOne({
        where: { id: sale.customerId, businessId: req.businessId }, transaction: t,
      });
      if (customer) {
        customer.balance = round2(Number(customer.balance) - Number(sale.balance));
        await customer.save({ transaction: t });
      }
      await CreditTransaction.create({
        businessId: req.businessId, customerId: sale.customerId, saleId: sale.id,
        type: 'credit', amount: Number(sale.balance), balance: 0,
        description: `Reversal of sale ${sale.invoiceNumber}`,
      }, { transaction: t });
    }

    await sale.update({ status: 'cancelled', balance: 0 }, { transaction: t });
    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'SALE_CANCELLED', entity: 'Sale', entityId: sale.id, req });
    res.json({ message: 'Sale cancelled', sale });
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};