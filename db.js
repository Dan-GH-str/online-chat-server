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
//     process.env.DB_NAME,    // Название БД
//     process.env.DB_USER,    // Пользователь
//     process.env.DB_PASSWORD,    // Пароль
//     {
//         dialect: 'postgres', // СУБД
//         host: process.env.DB_HOST,
//         port: process.env.DB_PORT
//     }
// )
