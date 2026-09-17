const { Partner, Capital } = require('../models');
const audit = require('../services/auditService');
const { round2 } = require('../utils/helpers');

exports.listPartners = async (req, res, next) => {
  try {
    const partners = await Partner.findAll({ where: { businessId: req.businessId } });
    res.json(partners);
  } catch (err) { next(err); }
};

exports.createPartner = async (req, res, next) => {
  try {
    const partner = await Partner.create({ businessId: req.businessId, ...req.body });
    res.status(201).json(partner);
  } catch (err) { next(err); }
};

exports.updatePartner = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!partner) return res.status(404).json({ message: 'Not found' });
    await partner.update(req.body);
    res.json(partner);
  } catch (err) { next(err); }
};

exports.deletePartner = async (req, res, next) => {
  try {
    const partner = await Partner.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!partner) return res.status(404).json({ message: 'Not found' });
    await partner.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.listCapital = async (req, res, next) => {
  try {
    const capital = await Capital.findAll({ where: { businessId: req.businessId }, order: [['date', 'DESC']] });
    const total = capital.reduce((s, c) => s + (c.type === 'capital' ? Number(c.amount) : -Number(c.amount)), 0);
    res.json({ total, entries: capital });
  } catch (err) { next(err); }
};

exports.createCapital = async (req, res, next) => {
  try {
    const cap = await Capital.create({
      businessId: req.businessId,
      contributorId: req.body.contributorId || null,
      amount: round2(Number(req.body.amount)),
      type: req.body.type || 'capital',
      description: req.body.description,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      createdBy: req.user.id,
    });
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'CAPITAL_ADD', entity: 'Capital', entityId: cap.id, req });
    res.status(201).json(cap);
  } catch (err) { next(err); }
};