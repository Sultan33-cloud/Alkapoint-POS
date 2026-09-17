const bcrypt = require('bcryptjs');
const { User, Role, Branch } = require('../models');
const audit = require('../services/auditService');

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { businessId: req.businessId },
      attributes: { exclude: ['password'] },
      include: [{ model: Role }, { model: Branch }],
    });
    res.json(users);
  } catch (err) { next(err); }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, roleId, branchId } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password min 6 chars' });

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ message: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      businessId: req.businessId, name, email: email.toLowerCase(), phone,
      password: hash, roleId, branchId: branchId || req.user.branchId, isActive: true,
    });

    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'CREATE', entity: 'User', entityId: user.id, req });
    const { password: _, ...safe } = user.toJSON();
    res.status(201).json(safe);
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    // Allow a user to edit their own profile without admin rights,
    // but only safe fields.
    const isSelf = req.params.id === req.user.id;
    const user = await User.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!user) return res.status(404).json({ message: 'Not found' });

    let payload = { ...req.body };

    if (isSelf) {
      // Self-edit: only these fields allowed
      payload = {};
      const allowed = ['name', 'phone', 'avatar', 'password'];
      for (const k of allowed) if (k in req.body) payload[k] = req.body[k];
    }

    if (payload.password) {
      if (payload.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      payload.password = await bcrypt.hash(payload.password, 10);
    }

    await user.update(payload);
    const { password: _, ...safe } = user.toJSON();
    res.json(safe);
  } catch (err) { next(err); }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    const user = await User.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.update({ isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
};

exports.listRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({ where: { businessId: req.businessId } });
    res.json(roles);
  } catch (err) { next(err); }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Role name is required' });

    const dup = await Role.findOne({ where: { businessId: req.businessId, name: name.trim() } });
    if (dup) return res.status(409).json({ message: 'A role with that name already exists' });

    const role = await Role.create({
      businessId: req.businessId,
      name: name.trim(),
      description: description || null,
      permissions: Array.isArray(permissions) ? permissions : [],
    });
    res.status(201).json(role);
  } catch (err) { next(err); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!role) return res.status(404).json({ message: 'Not found' });

    if (role.name === 'Owner' && req.body.name && req.body.name !== 'Owner') {
      return res.status(400).json({ message: 'Cannot rename the Owner role' });
    }

    const payload = { ...req.body };
    if (Array.isArray(payload.permissions)) {
      payload.permissions = payload.permissions;
    }
    await role.update(payload);
    res.json(role);
  } catch (err) { next(err); }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    if (role.name === 'Owner') {
      return res.status(400).json({ message: 'Cannot delete the Owner role' });
    }

    const userCount = await User.count({ where: { roleId: role.id } });
    if (userCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — ${userCount} user(s) still have this role. Reassign them first.`,
      });
    }

    await role.destroy();
    await audit.log({
      businessId: req.businessId, userId: req.user.id,
      action: 'DELETE', entity: 'Role', entityId: role.id, req,
    });
    res.json({ message: 'Role deleted' });
  } catch (err) { next(err); }
};