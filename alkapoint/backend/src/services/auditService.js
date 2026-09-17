const { AuditLog } = require('../models');

exports.log = async ({ businessId, userId, action, entity, entityId, oldValues, newValues, req }) => {
  try {
    await AuditLog.create({
      businessId, userId, action, entity, entityId, oldValues, newValues,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};