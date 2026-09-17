const { Expense, ExpenseCategory } = require('../models');
const { Op } = require('sequelize');
const audit = require('../services/auditService');

exports.listExpenses = async (req, res, next) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    const where = { businessId: req.businessId };
    if (startDate) where.expenseDate = { [Op.gte]: new Date(startDate) };
    if (endDate) where.expenseDate = { ...(where.expenseDate || {}), [Op.lte]: new Date(endDate) };
    if (categoryId) where.categoryId = categoryId;

    const expenses = await Expense.findAll({
      where,
      include: [{ model: ExpenseCategory, as: 'category', attributes: ['id', 'name'] }],
      order: [['expenseDate', 'DESC']],
      limit: 500,
    });
    res.json(expenses);
  } catch (err) { next(err); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { categoryId, amount, description, expenseDate, paymentMethod, reference } = req.body;
    const expense = await Expense.create({
      businessId: req.businessId, branchId: req.user.branchId,
      categoryId, amount: Number(amount), description,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      paymentMethod: paymentMethod || 'cash', reference: reference || null,
      createdBy: req.user.id,
    });
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'CREATE', entity: 'Expense', entityId: expense.id, req });
    res.status(201).json(expense);
  } catch (err) { next(err); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!expense) return res.status(404).json({ message: 'Not found' });
    await expense.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.listCategories = async (req, res, next) => {
  try {
    const cats = await ExpenseCategory.findAll({ where: { businessId: req.businessId } });
    res.json(cats);
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const cat = await ExpenseCategory.create({ businessId: req.businessId, name: req.body.name });
    res.status(201).json(cat);
  } catch (err) { next(err); }
};