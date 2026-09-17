'use strict';
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const uuid = () => crypto.randomUUID();

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const businessId = uuid();
    await queryInterface.bulkInsert('businesses', [{
      id: businessId,
      name: 'Alkantra Coastal Products',
      slug: 'Pwani-Plug KE',
      currency: 'KES',
      taxRate: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }]);

    const branchId = uuid();
    await queryInterface.bulkInsert('branches', [{
      id: branchId, businessId, name: 'Main Branch', location: 'Nairobi',
      isActive: true, createdAt: now, updatedAt: now,
    }]);

    const roleId = uuid();
    await queryInterface.bulkInsert('roles', [{
      id: roleId, businessId, name: 'Owner', description: 'Full system access',
      permissions: JSON.stringify([
        'view_dashboard', 'create_sale', 'view_sales', 'cancel_sale',
        'manage_products', 'view_products',
        'manage_inventory', 'view_inventory',
        'manage_customers', 'view_customers',
        'manage_debtors', 'view_debtors',
        'manage_expenses', 'view_expenses',
        'view_reports', 'view_financials',
        'manage_users', 'manage_settings', 'manage_partners',
      ]),
      createdAt: now, updatedAt: now,
    }]);

    const cashierRoleId = uuid();
    await queryInterface.bulkInsert('roles', [{
      id: cashierRoleId, businessId, name: 'Cashier',
      description: 'POS and customer operations only',
      permissions: JSON.stringify([
        'create_sale', 'view_sales', 'view_products',
        'view_inventory', 'view_customers', 'manage_customers',
      ]),
      createdAt: now, updatedAt: now,
    }]);

    const passwordHash = await bcrypt.hash('admin123', 10);
    const adminId = uuid();
    await queryInterface.bulkInsert('users', [{
      id: adminId, businessId, branchId, roleId,
      name: 'Sultan Alkantra',
      email: 'omondipeddy83@gmail.com',
      phone: '+254114344926',
      password: passwordHash,
      isActive: true,
      createdAt: now, updatedAt: now,
    }]);

    const unitPieceId = uuid();
    await queryInterface.bulkInsert('units', [{
      id: unitPieceId, businessId, name: 'Piece', abbreviation: 'pc',
      createdAt: now, updatedAt: now,
    }]);

    const catPerfumes = uuid();
    const catSnacks = uuid();
    await queryInterface.bulkInsert('categories', [
      { id: catPerfumes, businessId, name: 'Perfumes', description: 'Fragrances', isActive: true, createdAt: now, updatedAt: now },
      { id: catSnacks, businessId, name: 'Snacks', description: 'Coastal snacks', isActive: true, createdAt: now, updatedAt: now },
    ]);

    const prodPerfume = uuid();
    const prodSnack = uuid();
    await queryInterface.bulkInsert('products', [
      { id: prodPerfume, businessId, categoryId: catPerfumes, name: 'Pure Black', hasVariants: false, isActive: true, createdAt: now, updatedAt: now },
      { id: prodSnack, businessId, categoryId: catSnacks, name: 'Mabuyu', hasVariants: true, isActive: true, createdAt: now, updatedAt: now },
    ]);

    const varPureBlack = uuid();
    const varStrawberry = uuid();
    await queryInterface.bulkInsert('product_variants', [
      { id: varPureBlack, productId: prodPerfume, name: '100ml', unitId: unitPieceId, costPrice: 600, sellingPrice: 1000, reorderLevel: 5, isActive: true, createdAt: now, updatedAt: now },
      { id: varStrawberry, productId: prodSnack, name: 'Strawberry', unitId: unitPieceId, costPrice: 50, sellingPrice: 100, reorderLevel: 10, isActive: true, createdAt: now, updatedAt: now },
    ]);

    await queryInterface.bulkInsert('inventory_batches', [
      { id: uuid(), businessId, branchId, variantId: varPureBlack, quantityReceived: 30, quantityRemaining: 30, costPerUnit: 600, batchRef: 'INIT-PB', receivedAt: now, createdAt: now, updatedAt: now },
      { id: uuid(), businessId, branchId, variantId: varStrawberry, quantityReceived: 200, quantityRemaining: 200, costPerUnit: 50, batchRef: 'INIT-MB', receivedAt: now, createdAt: now, updatedAt: now },
    ]);

    await queryInterface.bulkInsert('expense_categories', [
      { id: uuid(), businessId, name: 'Transport', createdAt: now, updatedAt: now },
      { id: uuid(), businessId, name: 'Rent', createdAt: now, updatedAt: now },
      { id: uuid(), businessId, name: 'Utilities', createdAt: now, updatedAt: now },
      { id: uuid(), businessId, name: 'Salaries', createdAt: now, updatedAt: now },
    ]);

    console.log('✅ Seed complete. Login: omondipeddy83@gmail.com / admin123');
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('inventory_batches', null, {});
    await queryInterface.bulkDelete('product_variants', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('units', null, {});
    await queryInterface.bulkDelete('expense_categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('branches', null, {});
    await queryInterface.bulkDelete('businesses', null, {});
  },
};