const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Role, Business, Branch } = require('../models');
const audit = require('../services/auditService');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      include: [{ model: Role }, { model: Business }, { model: Branch }],
    });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account disabled' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, businessId: user.businessId, roleId: user.roleId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await audit.log({
      businessId: user.businessId, userId: user.id,
      action: 'LOGIN', entity: 'User', entityId: user.id, req,
    });

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, phone: user.phone,
        role: user.Role, business: user.Business, branch: user.Branch,
        Role: user.Role, Business: user.Business, Branch: user.Branch,
      },
    });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Role }, { model: Business }, { model: Branch }],
      attributes: { exclude: ['password'] },
    });
    res.json(user);
  } catch (err) { next(err); }
};