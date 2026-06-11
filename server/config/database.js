const { Sequelize } = require('sequelize');

// Aiven MySQL (and most managed cloud MySQL) requires SSL in production.
// Set DB_SSL=true in your Render environment variables to enable it.
const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: false,

    // SSL — required for Aiven / most cloud MySQL providers
    ...(useSSL && {
      dialectOptions: {
        ssl: {
          rejectUnauthorized: false, // Aiven uses self-signed certs on free tier
        },
      },
    }),

    pool: {
      max:     5,
      min:     0,
      acquire: 30000,
      idle:    10000,
    },
  }
);

module.exports = sequelize;
