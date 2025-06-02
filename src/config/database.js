console.log('--- database.js file is being loaded ---');
import Sequelize from 'sequelize';
import logger from '../config/logger.js';

import dotenv from 'dotenv';
dotenv.config();

export { DataTypes } from 'sequelize';

let DATABASE = process.env.DATABASE;
let USERNAME = process.env.USERNAME;
let PASSWORD = process.env.PASSWORD;
let HOST = process.env.HOST;
let PORT = process.env.PORT;
let DIALECT = process.env.DIALECT;

if (process.env.NODE_ENV === 'test') {
  DATABASE = process.env.DATABASE_TEST;
  USERNAME = process.env.USERNAME_TEST;
  PASSWORD = process.env.PASSWORD_TEST;
  HOST = process.env.HOST_TEST;
  PORT = process.env.PORT_TEST;
  DIALECT = process.env.DIALECT_TEST;
}

const sequelize = new Sequelize(DATABASE, USERNAME, PASSWORD, {
  host: HOST,
  port: PORT,
  dialect: DIALECT,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    logger.info('Connected to the database.');
  })
  .catch((error) => {
    logger.error('Could not connect to the database.', error);
    console.log('Connection failed.');
  });

await sequelize.sync({ force: false });

export default sequelize;
