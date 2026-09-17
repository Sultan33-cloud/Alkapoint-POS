const { Customer, Sale, Payment, CreditTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');
const { round2 } = require('../utils/helpers');
const audit = require('../services/auditService');

exports.listCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    const where = { businessId: req.businessId };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const customers = await Customer.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(customers);
  } catch (err) { next(err); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!customer) return res.status(404).json({ message: 'Not found' });

    const sales = await Sale.findAll({
      where: { customerId: customer.id },
      order: [['saleDate', 'DESC']],
      limit: 50,
      include: [{ model: Payment, as: 'payments' }],
    });

    const totals = {
      orders: sales.length,
      spent: sales.reduce((s, x) => s + Number(x.total), 0),
      paid: sales.reduce((s, x) => s + Number(x.amountPaid), 0),
      balance: Number(customer.balance),
    };

    res.json({ customer, sales, totals });
  } catch (err) { next(err); }
};

exports.createCustomer = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { openingBalance = 0, openingNote, ...customerData } = req.body;

    const customer = await Customer.create(
      { businessId: req.businessId, ...customerData },
      { transaction: t }
    );

    const openAmt = round2(Number(openingBalance) || 0);
    if (openAmt > 0) {
      const { generateInvoiceNumber } = require('../utils/helpers');

      const sale = await Sale.create({
        businessId: req.businessId,
        branchId: req.user.branchId,
        customerId: customer.id,
        invoiceNumber: generateInvoiceNumber('OPEN'),
        saleDate: new Date(),
        subtotal: openAmt,
        discount: 0,
        tax: 0,
        total: openAmt,
        amountPaid: 0,
        balance: openAmt,
        totalCost: 0,
        grossProfit: 0,
        isCredit: true,
        dueDate: null,
        status: 'pending',
        notes: openingNote || 'Opening balance',
        createdBy: req.user.id,
      }, { transaction: t });

      await customer.update({ balance: openAmt }, { transaction: t });

      await CreditTransaction.create({
        businessId: req.businessId,
        customerId: customer.id,
        saleId: sale.id,
        type: 'debit',
        amount: openAmt,
        balance: openAmt,
        description: openingNote || 'Opening balance',
      }, { transaction: t });
    }

    await t.commit();

    await audit.log({
      businessId: req.businessId, userId: req.user.id,
      action: 'CREATE', entity: 'Customer', entityId: customer.id, req,
    });

    res.status(201).json(customer);
  } catch (err) {
    if (!t.finished) await t.rollback();
    next(err);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    await customer.update(req.body);
    res.json(customer);
  } catch (err) { next(err); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    if (Number(customer.balance) > 0) return res.status(400).json({ message: 'Cannot delete customer with outstanding balance' });
    await customer.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getStatement = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!customer) return res.status(404).json({ message: 'Not found' });

    const credits = await CreditTransaction.findAll({
      where: { customerId: customer.id, businessId: req.businessId },
      include: [{ model: Sale, as: 'sale', attributes: ['invoiceNumber'] }],
      order: [['createdAt', 'ASC']],
    });

    let balance = 0;
    const rows = credits.map((ct) => {
      const debit = ct.type === 'debit' ? Number(ct.amount) : 0;
      const credit = ct.type === 'credit' ? Number(ct.amount) : 0;
      balance += debit - credit;
      return {
        id: ct.id, date: ct.createdAt,
        description: ct.description || `Invoice ${ct.sale?.invoiceNumber || ''}`,
        debit, credit, balance,
      };
    });

    res.json({ customer, statement: rows, closingBalance: balance });
  } catch (err) { next(err); }
};