const sequelize = require('../db')
const { DataTypes } = require('sequelize')

const Room = sequelize.define('room', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true},
    data: {type: DataTypes.JSON}
})

module.exports = {
    Room
}