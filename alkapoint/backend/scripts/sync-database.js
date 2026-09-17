const { sequelize } = require('../src/models');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log('Database schema is ready');
  } catch (error) {
    console.error('Unable to prepare the database schema:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
