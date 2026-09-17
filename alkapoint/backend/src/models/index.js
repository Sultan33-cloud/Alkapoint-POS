const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ---------- TENANT / BUSINESS ----------
const Business = sequelize.define('Business', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, unique: true },
  logo: DataTypes.TEXT,
  address: DataTypes.TEXT,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  currency: { type: DataTypes.STRING, defaultValue: 'KES' },
  taxRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'businesses', paranoid: true });

const Branch = sequelize.define('Branch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  location: DataTypes.STRING,
  phone: DataTypes.STRING,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'branches', paranoid: true });

// ---------- USERS & PERMISSIONS ----------
const Role = sequelize.define('Role', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  permissions: { type: DataTypes.JSONB, defaultValue: [] },
}, { tableName: 'roles', paranoid: true });

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: DataTypes.UUID,
  roleId: DataTypes.UUID,
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: DataTypes.STRING,
  password: { type: DataTypes.STRING, allowNull: false },
  avatar: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLoginAt: DataTypes.DATE,
}, { tableName: 'users', paranoid: true });

// ---------- PRODUCTS ----------
const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  image: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'categories', paranoid: true });

const Unit = sequelize.define('Unit', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  abbreviation: DataTypes.STRING,
}, { tableName: 'units' });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  sku: DataTypes.STRING,
  barcode: DataTypes.STRING,
  description: DataTypes.TEXT,
  image: DataTypes.STRING,
  hasVariants: { type: DataTypes.BOOLEAN, defaultValue: false },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'products', paranoid: true });

const ProductVariant = sequelize.define('ProductVariant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  productId: { type: DataTypes.UUID, allowNull: false },
  unitId: DataTypes.UUID,
  name: { type: DataTypes.STRING, allowNull: false },
  sku: DataTypes.STRING,
  barcode: DataTypes.STRING,
  costPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  sellingPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  wholesalePrice: DataTypes.DECIMAL(12, 2),
  reorderLevel: { type: DataTypes.INTEGER, defaultValue: 5 },
  image: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'product_variants', paranoid: true });

// ---------- SUPPLIERS & PURCHASES ----------
const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  contactPerson: DataTypes.STRING,
}, { tableName: 'suppliers', paranoid: true });

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  supplierId: DataTypes.UUID,
  reference: { type: DataTypes.STRING, unique: true },
  purchaseDate: { type: DataTypes.DATE, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  transportCost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  otherCosts: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalCost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  paymentStatus: { type: DataTypes.ENUM('unpaid', 'partial', 'paid'), defaultValue: 'paid' },
  amountPaid: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  createdBy: DataTypes.UUID,
}, { tableName: 'purchases', paranoid: true });

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  purchaseId: { type: DataTypes.UUID, allowNull: false },
  variantId: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  totalCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  allocatedTransport: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  allocatedOther: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  finalUnitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: 'purchase_items' });

// ---------- INVENTORY ----------
const InventoryBatch = sequelize.define('InventoryBatch', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  variantId: { type: DataTypes.UUID, allowNull: false },
  purchaseItemId: DataTypes.UUID,
  batchRef: DataTypes.STRING,
  quantityReceived: { type: DataTypes.INTEGER, allowNull: false },
  quantityRemaining: { type: DataTypes.INTEGER, allowNull: false },
  costPerUnit: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  expiryDate: DataTypes.DATE,
  receivedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'inventory_batches' });

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  variantId: { type: DataTypes.UUID, allowNull: false },
  batchId: DataTypes.UUID,
  type: { type: DataTypes.ENUM('purchase', 'sale', 'return', 'adjustment', 'transfer'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  referenceId: DataTypes.UUID,
  previousQty: DataTypes.INTEGER,
  newQty: DataTypes.INTEGER,
  notes: DataTypes.TEXT,
  createdBy: DataTypes.UUID,
}, { tableName: 'stock_movements' });

// ---------- CUSTOMERS ----------
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  altPhone: DataTypes.STRING,
  email: DataTypes.STRING,
  address: DataTypes.TEXT,
  creditLimit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'customers', paranoid: true });

// ---------- SALES ----------
const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  customerId: DataTypes.UUID,
  invoiceNumber: { type: DataTypes.STRING, unique: true },
  saleDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  tax: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  amountPaid: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalCost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  grossProfit: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  isCredit: { type: DataTypes.BOOLEAN, defaultValue: false },
  dueDate: DataTypes.DATE,
  status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled', 'overdue'), defaultValue: 'completed' },
  notes: DataTypes.TEXT,
  createdBy: DataTypes.UUID,
}, { tableName: 'sales', paranoid: true });

const SaleItem = sequelize.define('SaleItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  saleId: { type: DataTypes.UUID, allowNull: false },
  variantId: { type: DataTypes.UUID, allowNull: false },
  productName: DataTypes.STRING,
  variantName: DataTypes.STRING,
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  unitCost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  profit: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
}, { tableName: 'sale_items' });

// ---------- PAYMENTS ----------
const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  saleId: DataTypes.UUID,
  customerId: DataTypes.UUID,
  purchaseId: DataTypes.UUID,
  type: { type: DataTypes.ENUM('sale', 'purchase', 'debtor'), defaultValue: 'sale' },
  method: { type: DataTypes.ENUM('cash', 'mpesa', 'bank', 'card', 'credit', 'other'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  reference: DataTypes.STRING,
  phoneNumber: DataTypes.STRING,
  transactionId: DataTypes.STRING,
  paymentDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'reversed'), defaultValue: 'completed' },
  notes: DataTypes.TEXT,
  createdBy: DataTypes.UUID,
}, { tableName: 'payments', paranoid: true });

const CreditTransaction = sequelize.define('CreditTransaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  customerId: { type: DataTypes.UUID, allowNull: false },
  saleId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  dueDate: DataTypes.DATE,
  description: DataTypes.STRING,
  paymentId: DataTypes.UUID,
}, { tableName: 'credit_transactions' });

// ---------- EXPENSES ----------
const ExpenseCategory = sequelize.define('ExpenseCategory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'expense_categories', paranoid: true });

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  branchId: { type: DataTypes.UUID, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  description: DataTypes.TEXT,
  expenseDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'cash' },
  reference: DataTypes.STRING,
  createdBy: DataTypes.UUID,
}, { tableName: 'expenses', paranoid: true });

// ---------- CAPITAL & PARTNERS ----------
const Capital = sequelize.define('Capital', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  contributorId: DataTypes.UUID,
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  type: { type: DataTypes.ENUM('capital', 'withdrawal'), defaultValue: 'capital' },
  description: DataTypes.TEXT,
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  createdBy: DataTypes.UUID,
}, { tableName: 'capital' });

const Partner = sequelize.define('Partner', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  sharePercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  totalContributed: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalSettled: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  notes: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'partners', paranoid: true });

// ---------- AUDIT LOG ----------
const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  businessId: DataTypes.UUID,
  userId: DataTypes.UUID,
  action: { type: DataTypes.STRING, allowNull: false },
  entity: DataTypes.STRING,
  entityId: DataTypes.UUID,
  oldValues: DataTypes.JSONB,
  newValues: DataTypes.JSONB,
  ip: DataTypes.STRING,
  userAgent: DataTypes.TEXT,
}, { tableName: 'audit_logs', updatedAt: false });

// ---------- ASSOCIATIONS ----------
Business.hasMany(Branch, { foreignKey: 'businessId', as: 'branches' });
Branch.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(User, { foreignKey: 'businessId', as: 'users' });
User.belongsTo(Business, { foreignKey: 'businessId' });
Branch.hasMany(User, { foreignKey: 'branchId' });
User.belongsTo(Branch, { foreignKey: 'branchId' });
Role.hasMany(User, { foreignKey: 'roleId' });
User.belongsTo(Role, { foreignKey: 'roleId' });
Business.hasMany(Role, { foreignKey: 'businessId' });
Role.belongsTo(Business, { foreignKey: 'businessId' });

Business.hasMany(Category, { foreignKey: 'businessId' });
Category.belongsTo(Business, { foreignKey: 'businessId' });
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants', onDelete: 'CASCADE' });
ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProductVariant.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });

Supplier.hasMany(Purchase, { foreignKey: 'supplierId' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchaseId', as: 'items', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchaseId' });
PurchaseItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

InventoryBatch.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
InventoryBatch.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
ProductVariant.hasMany(InventoryBatch, { foreignKey: 'variantId', as: 'batches' });

StockMovement.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
StockMovement.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

Customer.hasMany(Sale, { foreignKey: 'customerId', as: 'sales' });
Sale.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Sale.hasMany(SaleItem, { foreignKey: 'saleId', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });
SaleItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
Sale.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
Sale.belongsTo(User, { foreignKey: 'createdBy', as: 'cashier' });

Sale.hasMany(Payment, { foreignKey: 'saleId', as: 'payments' });
Payment.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
Payment.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'recordedBy' });

Customer.hasMany(CreditTransaction, { foreignKey: 'customerId' });
CreditTransaction.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
CreditTransaction.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });
CreditTransaction.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

ExpenseCategory.hasMany(Expense, { foreignKey: 'categoryId', as: 'expenses' });
Expense.belongsTo(ExpenseCategory, { foreignKey: 'categoryId', as: 'category' });
Expense.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

Business.hasMany(Partner, { foreignKey: 'businessId' });
Partner.belongsTo(Business, { foreignKey: 'businessId' });

Purchase.hasMany(Payment, { foreignKey: 'purchaseId', as: 'payments' });
Payment.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });

Business.hasMany(Capital, { foreignKey: 'businessId' });
Capital.belongsTo(Business, { foreignKey: 'businessId' });

User.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Business, Branch, Role, User,
  Category, Unit, Product, ProductVariant,
  Supplier, Purchase, PurchaseItem,
  InventoryBatch, StockMovement,
  Customer, Sale, SaleItem, Payment, CreditTransaction,
  ExpenseCategory, Expense,
  Capital, Partner, AuditLog,
};