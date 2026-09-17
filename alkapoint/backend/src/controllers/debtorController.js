const { Customer, Sale, Payment, CreditTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const { round2 } = require('../utils/helpers');
const audit = require('../services/auditService');

exports.listDebtors = async (req, res, next) => {
  try {
    const customers = await Customer.findAll({
      where: { businessId: req.businessId, balance: { [Op.gt]: 0 } },
      order: [['balance', 'DESC']],
    });

    const now = new Date();

    const enriched = await Promise.all(customers.map(async (c) => {
      const sales = await Sale.findAll({
        where: { customerId: c.id, balance: { [Op.gt]: 0 }, isCredit: true },
        attributes: ['balance', 'dueDate', 'saleDate'],
      });

      const aging = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
      for (const s of sales) {
        const days = s.dueDate
          ? Math.floor((now - new Date(s.dueDate)) / (1000 * 60 * 60 * 24))
          : Math.floor((now - new Date(s.saleDate)) / (1000 * 60 * 60 * 24));
        const bal = Number(s.balance);
        if (days <= 0) aging.current += bal;
        else if (days <= 30) aging.days30 += bal;
        else if (days <= 60) aging.days60 += bal;
        else if (days <= 90) aging.days90 += bal;
        else aging.days90plus += bal;
      }

      return {
        id: c.id, name: c.name, phone: c.phone, email: c.email,
        balance: Number(c.balance), creditLimit: Number(c.creditLimit), aging,
      };
    }));

    res.json(enriched);
  } catch (err) { next(err); }
};

exports.recordPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { customerId, saleId, amount, method, reference, phoneNumber, notes } = req.body;
    const amt = round2(Number(amount));
    if (!amt || amt <= 0) { await t.rollback(); return res.status(400).json({ message: 'Invalid amount' }); }

    const customer = await Customer.findOne({
      where: { id: customerId, businessId: req.businessId },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!customer) { await t.rollback(); return res.status(404).json({ message: 'Customer not found' }); }

    let sale = null;
    if (saleId) {
      sale = await Sale.findOne({
        where: { id: saleId, customerId, isCredit: true, balance: { [Op.gt]: 0 } },
        transaction: t, lock: t.LOCK.UPDATE,
      });
    } else {
      sale = await Sale.findOne({
        where: { customerId, isCredit: true, balance: { [Op.gt]: 0 } },
        order: [['saleDate', 'ASC']], transaction: t, lock: t.LOCK.UPDATE,
      });
    }
    if (!sale) { await t.rollback(); return res.status(400).json({ message: 'No outstanding credit sale found' }); }

    const appliedAmount = Math.min(amt, Number(sale.balance));
    const newSaleBalance = round2(Number(sale.balance) - appliedAmount);
    const newAmountPaid = round2(Number(sale.amountPaid) + appliedAmount);

    const payment = await Payment.create({
      businessId: req.businessId, branchId: req.user.branchId,
      saleId: sale.id, customerId, type: 'debtor',
      method: method || 'cash', amount: appliedAmount,
      reference: reference || null, phoneNumber: phoneNumber || null,
      status: 'completed', notes, createdBy: req.user.id,
    }, { transaction: t });

    await sale.update({
      amountPaid: newAmountPaid, balance: newSaleBalance,
      status: newSaleBalance === 0 ? 'completed' : 'pending',
    }, { transaction: t });

    const newCustBalance = round2(Number(customer.balance) - appliedAmount);
    await customer.update({ balance: newCustBalance }, { transaction: t });

    await CreditTransaction.create({
      businessId: req.businessId, customerId, saleId: sale.id,
      type: 'credit', amount: appliedAmount, balance: newCustBalance,
      description: `Payment on invoice ${sale.invoiceNumber}`, paymentId: payment.id,
    }, { transaction: t });

    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'DEBTOR_PAYMENT', entity: 'Customer', entityId: customerId, newValues: { amount: appliedAmount, method }, req });

    res.status(201).json({ message: 'Payment recorded', payment, customerBalance: newCustBalance, saleBalance: newSaleBalance });
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

exports.getAgingReport = async (req, res, next) => {
  try {
    const customers = await Customer.findAll({
      where: { businessId: req.businessId, balance: { [Op.gt]: 0 } },
      attributes: ['id', 'name', 'phone', 'balance'],
    });

    const now = new Date();
    const totals = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };

    for (const c of customers) {
      const sales = await Sale.findAll({
        where: { customerId: c.id, isCredit: true, balance: { [Op.gt]: 0 } },
        attributes: ['balance', 'dueDate', 'saleDate'],
      });
      for (const s of sales) {
        const days = s.dueDate
          ? Math.floor((now - new Date(s.dueDate)) / (1000 * 60 * 60 * 24))
          : Math.floor((now - new Date(s.saleDate)) / (1000 * 60 * 60 * 24));
        const bal = Number(s.balance);
        if (days <= 0) totals.current += bal;
        else if (days <= 30) totals.days30 += bal;
        else if (days <= 60) totals.days60 += bal;
        else if (days <= 90) totals.days90 += bal;
        else totals.days90plus += bal;
      }
    }

    res.json(totals);
  } catch (err) { next(err); }
};

/**
 * Manually add a debt against a customer.
 * Creates a synthetic credit sale so it flows through aging, statements,
 * and the debtor payment logic identically to real sales.
 */
exports.addManualDebt = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { customerId, amount, description, dueDate, reference } = req.body;

    const amt = round2(Number(amount));
    if (!amt || amt <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Invalid amount' });
    }
    if (!customerId) {
      await t.rollback();
      return res.status(400).json({ message: 'Customer is required' });
    }

    const customer = await Customer.findOne({
      where: { id: customerId, businessId: req.businessId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { generateInvoiceNumber } = require('../utils/helpers');

    const sale = await Sale.create({
      businessId: req.businessId,
      branchId: req.user.branchId,
      customerId,
      invoiceNumber: reference || generateInvoiceNumber('DEBT'),
      saleDate: new Date(),
      subtotal: amt,
      discount: 0,
      tax: 0,
      total: amt,
      amountPaid: 0,
      balance: amt,
      totalCost: 0,
      grossProfit: 0,
      isCredit: true,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'pending',
      notes: description || 'Manual debt entry',
      createdBy: req.user.id,
    }, { transaction: t });

    const newBalance = round2(Number(customer.balance) + amt);
    await customer.update({ balance: newBalance }, { transaction: t });

    await CreditTransaction.create({
      businessId: req.businessId,
      customerId,
      saleId: sale.id,
      type: 'debit',
      amount: amt,
      balance: newBalance,
      dueDate: dueDate ? new Date(dueDate) : null,
      description: description || `Manual debt ${sale.invoiceNumber}`,
    }, { transaction: t });

    await t.commit();

    try {
      await audit.log({
        businessId: req.businessId,
        userId: req.user.id,
        action: 'MANUAL_DEBT_ADDED',
        entity: 'Customer',
        entityId: customerId,
        newValues: { amount: amt, description, saleId: sale.id },
        req,
      });
    } catch (_) {}

    res.status(201).json({
      message: 'Debt recorded',
      sale: {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        total: Number(sale.total),
        balance: Number(sale.balance),
      },
      customerBalance: newBalance,
    });
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};