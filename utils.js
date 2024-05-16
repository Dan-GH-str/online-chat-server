// БД
const models = require('./models/models')

const getMessagesFromRoom = async (room) => {
    const messages = await models.Room.findOne({
        raw: true,
        attributes: ["data"],
        where: {
            "name": room
        }
    })

    return messages ? messages.data : null
}

const trimStr = (str) => str.trim().toLowerCase()

module.exports = {
    trimStr,
    getMessagesFromRoom
}