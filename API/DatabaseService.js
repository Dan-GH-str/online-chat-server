const models = require('../models/models')

class DatabaseService {
    // Получение массива всех сообщений в комнате
    static async getMessagesFromRoom(room)  {
        const messages = await models.Room.findOne({
            raw: true,
            attributes: ["data"],
            where: {
                "name": room
            }
        })
    
        return messages ? messages.data : null
    }

    // Добавление нового сообщения в историю сообщений в бд
    static async updateMessagesHistory(room, newMessage) {
        const messagesHistory = await this.getMessagesFromRoom(room)

        // Сохранение нового сообщения в историю сообщений
        messagesHistory.push(newMessage)

        await models.Room.update(
            {
                data: messagesHistory
            },
            {
                where: {
                    "name": room
                }
            }
        )
    }

    // Генерация уникального id для нового сообщения в комнате
    static async generateMessageID(room) {
        const messagesHistory = await this.getMessagesFromRoom(room)

        const id = messagesHistory.length ? messagesHistory[messagesHistory.length - 1].id + 1 : 1

        return id
    }
}

module.exports = {
    DatabaseService
}