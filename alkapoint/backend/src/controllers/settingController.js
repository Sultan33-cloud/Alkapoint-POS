const { Business, Branch } = require('../models');
const audit = require('../services/auditService');

exports.getBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.businessId);
    if (!business) return res.status(404).json({ message: 'Not found' });
    res.json(business);
  } catch (err) { next(err); }
};

exports.updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findByPk(req.businessId);
    if (!business) return res.status(404).json({ message: 'Not found' });
    const old = business.toJSON();
    await business.update(req.body);
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'UPDATE', entity: 'Business', entityId: business.id, oldValues: old, newValues: business.toJSON(), req });
    res.json(business);
  } catch (err) { next(err); }
};

exports.listBranches = async (req, res, next) => {
  try {
    const branches = await Branch.findAll({ where: { businessId: req.businessId } });
    res.json(branches);
  } catch (err) { next(err); }
};

exports.createBranch = async (req, res, next) => {
  try {
    const branch = await Branch.create({ businessId: req.businessId, ...req.body });
    res.status(201).json(branch);
  } catch (err) { next(err); }
};