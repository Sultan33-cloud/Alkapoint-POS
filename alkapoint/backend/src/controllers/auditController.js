const { AuditLog, User } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const { limit = 200 } = req.query;
    const logs = await AuditLog.findAll({
      where: { businessId: req.businessId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
};