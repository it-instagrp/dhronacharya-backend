import sequelize from '../config/database.js';
import User from './user.js';

/**** Associations ****/
// such as
// User.hasMany(Payments, {foreignKey: 'user_id', onDelete: 'CASCADE'}); <---- This is for example use associations according to our ER


const db = {
  sequelize,
  User
};

/**** Sync all models *****/
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('All models were synchronized successfully.');
  });

export default db;
