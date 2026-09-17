const { Category, Product, ProductVariant, Unit, InventoryBatch, sequelize } = require('../models');
const { Op } = require('sequelize');
const audit = require('../services/auditService');

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await Category.findAll({ where: { businessId: req.businessId }, order: [['name', 'ASC']] });
    res.json(categories);
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image } = req.body;
    const category = await Category.create({ businessId: req.businessId, name, description, image });
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'CREATE', entity: 'Category', entityId: category.id, newValues: category.toJSON(), req });
    res.status(201).json(category);
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const cat = await Category.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    const old = cat.toJSON();
    await cat.update(req.body);
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'UPDATE', entity: 'Category', entityId: cat.id, oldValues: old, newValues: cat.toJSON(), req });
    res.json(cat);
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const cat = await Category.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!cat) return res.status(404).json({ message: 'Category not found' });
    await cat.destroy();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'DELETE', entity: 'Category', entityId: cat.id, req });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.listUnits = async (req, res, next) => {
  try {
    const units = await Unit.findAll({ where: { businessId: req.businessId } });
    res.json(units);
  } catch (err) { next(err); }
};

exports.createUnit = async (req, res, next) => {
  try {
    const unit = await Unit.create({ businessId: req.businessId, ...req.body });
    res.status(201).json(unit);
  } catch (err) { next(err); }
};

exports.listProducts = async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;
    const where = { businessId: req.businessId };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;

    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: ProductVariant, as: 'variants', where: { isActive: true }, required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const result = await Promise.all(products.map(async (p) => {
      const plain = p.toJSON();
      if (plain.variants) {
        for (const v of plain.variants) {
          const stock = await InventoryBatch.sum('quantityRemaining', {
            where: { variantId: v.id, businessId: req.businessId },
          });
          v.stock = Number(stock || 0);
        }
      }
      return plain;
    }));

    res.json(result);
  } catch (err) { next(err); }
};

exports.getProduct = async (req, res, next) => {
  try {
    const p = await Product.findOne({
      where: { id: req.params.id, businessId: req.businessId },
      include: [{ model: Category, as: 'category' }, { model: ProductVariant, as: 'variants' }],
    });
    if (!p) return res.status(404).json({ message: 'Not found' });
    const plain = p.toJSON();
    if (plain.variants) {
      for (const v of plain.variants) {
        v.stock = Number(await InventoryBatch.sum('quantityRemaining', { where: { variantId: v.id, businessId: req.businessId } }) || 0);
      }
    }
    res.json(plain);
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { name, categoryId, sku, barcode, description, image, hasVariants, variants = [] } = req.body;
    const product = await Product.create({
      businessId: req.businessId, categoryId, name, sku, barcode, description, image,
      hasVariants: hasVariants || variants.length > 0,
    }, { transaction: t });

    for (const v of variants) {
      await ProductVariant.create({
        productId: product.id, name: v.name, sku: v.sku, barcode: v.barcode, unitId: v.unitId,
        costPrice: Number(v.costPrice || 0),
        sellingPrice: Number(v.sellingPrice || 0),
        wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
        reorderLevel: Number(v.reorderLevel || 5),
        image: v.image,
      }, { transaction: t });
    }

    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'CREATE', entity: 'Product', entityId: product.id, req });
    res.status(201).json(product);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findOne({ where: { id: req.params.id, businessId: req.businessId }, transaction: t });
    if (!product) { await t.rollback(); return res.status(404).json({ message: 'Not found' }); }

    const { variants, ...productData } = req.body;
    await product.update(productData, { transaction: t });

    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id) {
          await ProductVariant.update({
            name: v.name,
            costPrice: Number(v.costPrice || 0),
            sellingPrice: Number(v.sellingPrice || 0),
            wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
            reorderLevel: Number(v.reorderLevel || 5),
            isActive: v.isActive !== false,
          }, { where: { id: v.id, productId: product.id }, transaction: t });
        } else {
          await ProductVariant.create({
            productId: product.id, name: v.name,
            costPrice: Number(v.costPrice || 0),
            sellingPrice: Number(v.sellingPrice || 0),
            wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : null,
            reorderLevel: Number(v.reorderLevel || 5),
          }, { transaction: t });
        }
      }
    }

    await t.commit();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'UPDATE', entity: 'Product', entityId: product.id, req });
    res.json(product);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ where: { id: req.params.id, businessId: req.businessId } });
    if (!product) return res.status(404).json({ message: 'Not found' });
    await product.destroy();
    await audit.log({ businessId: req.businessId, userId: req.user.id, action: 'DELETE', entity: 'Product', entityId: product.id, req });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};