require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Models synced');
    }

    app.listen(PORT, () => {
      console.log(`🚀 AlkaPoint API listening on http://localhost:${PORT}`);
      console.log(`📚 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
}

start();