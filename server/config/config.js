require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'group_lunch',
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    dialect:  'mysql',
    logging:  false,
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME + '_test',
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 3306,
    dialect:  'mysql',
    logging:  false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    dialect:  'mysql',
    logging:  false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  },
};
