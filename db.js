const {Sequelize} = require('sequelize')
require('dotenv').config();

let { PGHOST, PGDATABASE, PGUSER, PGPASSWORD, ENDPOINT_ID } = process.env;

module.exports = new Sequelize(
  {
      dialect: 'postgres',
      host: PGHOST,
      database: PGDATABASE,
      username: PGUSER,
      password: PGPASSWORD,
      port: 5432,
      ssl: 'require',
      connection: {
          options: `project=${ENDPOINT_ID}`,
      },
      dialectOptions: {
          ssl: {
            "require": true,
          }
        }
  }
)

// module.exports = new Sequelize(
//     process.env.PGDATABASE,    // Название БД
//     process.env.PGUSER,    // Пользователь
//     process.env.PGPASSWORD,    // Пароль
//     {
//         dialect: 'postgres', // СУБД
//         host: process.env.PGHOST,
//         port: process.env.DB_PORT
//     }
// )

// module.exports = new Sequelize(process.env.DATABASE_URL, {})