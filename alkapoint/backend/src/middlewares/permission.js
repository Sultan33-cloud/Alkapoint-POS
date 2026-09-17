module.exports = (required) => {
  return (req, res, next) => {
    const role = req.user?.Role;
    if (!role) return res.status(403).json({ message: 'No role assigned' });
    if (role.name === 'Owner') return next();
    const perms = role.permissions || [];
    const list = Array.isArray(required) ? required : [required];
    const ok = list.every((p) => perms.includes(p));
    if (!ok) return res.status(403).json({ message: 'Insufficient permissions' });
    next();
  };
};