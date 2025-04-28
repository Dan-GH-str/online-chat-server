const sequelize = require('../db')
const { DataTypes } = require('sequelize')
const bcrypt = require('bcrypt');

const Room = sequelize.define('room', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING, unique: true},
    countOfUsers: {type: DataTypes.INTEGER, defaultValue: 0},
    data: {type: DataTypes.JSON}
})

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
    }, {
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10)
            user.password = await bcrypt.hash(user.password, salt)
        },

        beforeUpdate: async (user) => {
        if (user.changed('password')) {
            const salt = await bcrypt.genSalt(10)
            user.password = await bcrypt.hash(user.password, salt)
        }
        }
    }
})

User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password)
}

User.belongsToMany(Room, { through: 'UserRoom' })
Room.belongsToMany(User, { through: 'UserRoom' })

module.exports = {
    Room,
    User
}