const jwt = require('jsonwebtoken');
const { User, Business, Role, Branch } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Business },
        { model: Role },
        { model: Branch },
      ],
      attributes: { exclude: ['password'] },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid user' });
    }
    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};