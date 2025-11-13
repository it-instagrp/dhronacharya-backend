console.log('--- database.js file is being loaded ---');

import { Sequelize, DataTypes } from 'sequelize';
import logger from '../config/logger.js';
import * as dotenv from 'dotenv';
dotenv.config();

// 🧩 Load Database Configuration
let DATABASE = process.env.DB_NAME;
let USER_NAME = process.env.DB_USER;
let PASSWORD = process.env.DB_PASSWORD;
let HOST = process.env.DB_HOST;
let PORT = process.env.DB_PORT;
let DIALECT = process.env.DB_DIALECT;

if (process.env.NODE_ENV === 'test') {
  DATABASE = process.env.DB_NAME_TEST;
  USER_NAME = process.env.DB_USER_TEST;
  PASSWORD = process.env.DB_PASSWORD_TEST;
  HOST = process.env.DB_HOST_TEST;
  PORT = process.env.DB_PORT_TEST;
  DIALECT = process.env.DB_DIALECT_TEST;
}

// 🧠 Debug Check
console.log("Environment variables check:");
console.log({
  DATABASE,
  USER_NAME,
  PASSWORD,
  HOST,
  PORT,
  DIALECT
});

// 🚫 Validation
if (!DATABASE || !USER_NAME || !PASSWORD || !HOST || !PORT || !DIALECT) {
  throw new Error('❌ Database configuration is incomplete. Please check your .env file.');
}

// ⚙️ Initialize Sequelize
const sequelize = new Sequelize(DATABASE, USER_NAME, PASSWORD, {
  host: HOST,
  port: PORT,
  dialect: DIALECT,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// ✅ Test Connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection has been established successfully.');
    logger.info('Connected to the database successfully.');
  })
  .catch((error) => {
    console.error('❌ Unable to connect to the database:', error.message);
    logger.error('Database connection failed', error);
  });

export { DataTypes };
export default sequelize;
