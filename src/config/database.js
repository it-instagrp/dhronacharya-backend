console.log('--- database.js file is being loaded ---');
import pg from 'pg';
import Sequelize, { DataTypes } from 'sequelize';
import logger from '../config/logger.js';
import * as dotenv from 'dotenv';
dotenv.config();

let DATABASE = process.env.DATABASE;
let USER_NAME = "master";
let PASSWORD = process.env.PASSWORD;
let HOST = process.env.HOST;
let PORT = process.env.PORT;
let DIALECT = process.env.DIALECT;

if (process.env.NODE_ENV === 'test') {
  DATABASE = process.env.DATABASE_TEST;
  USER_NAME = "master";
  PASSWORD = process.env.PASSWORD_TEST;
  HOST = process.env.HOST_TEST;
  PORT = process.env.PORT_TEST;
  DIALECT = process.env.DIALECT_TEST;
}

console.log("Database Credentials:", { DATABASE, USER_NAME, PASSWORD, HOST, PORT, DIALECT });

const sequelize = new Sequelize(DATABASE, "master", PASSWORD, {
  host: HOST,
  port: PORT,
  dialect: DIALECT,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  } : {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    }
  },
});

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    logger.info('Connected to the database.');
  })
  .catch((error) => {
    logger.error('Could not connect to the database.', error);
    console.log('Connection failed.');
  });

export { DataTypes };
export default sequelize;
