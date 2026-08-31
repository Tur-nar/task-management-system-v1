const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

let sequelize;

if (process.env.DB_DIALECT === 'postgres') {
  // PostgreSQL configuration
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        },
      },
    }
  );
} else {
  // SQLite configuration (default for local development)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  });
}

module.exports = sequelize;
