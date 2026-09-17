const { Op } = require('sequelize');

exports.generateInvoiceNumber = (prefix = 'INV') => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
};

exports.generatePurchaseRef = () => exports.generateInvoiceNumber('PO');

exports.round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

exports.parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

exports.buildDateFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  if (startDate && endDate) {
    filter[field] = { [Op.between]: [new Date(startDate), new Date(endDate)] };
  } else if (startDate) {
    filter[field] = { [Op.gte]: new Date(startDate) };
  } else if (endDate) {
    filter[field] = { [Op.lte]: new Date(endDate) };
  }
  return filter;
};

exports.dateRange = (period) => {
  const now = new Date();
  const start = new Date();
  switch (period) {
    case 'today': start.setHours(0, 0, 0, 0); break;
    case '7d': start.setDate(now.getDate() - 7); break;
    case '30d': start.setDate(now.getDate() - 30); break;
    case '90d': start.setDate(now.getDate() - 90); break;
    case '1y': start.setFullYear(now.getFullYear() - 1); break;
    default: start.setDate(now.getDate() - 30);
  }
  return { start, end: now };
};