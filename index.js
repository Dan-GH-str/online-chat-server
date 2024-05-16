// подключение express и модуля http
require('dotenv').config()
const express = require("express")
const { Server } = require('socket.io')
const cors = require('cors')
const http = require('http')
const router = require('./router')
const { addUser, getRoomUsers, removeUser } = require('./user')

// БД
const sequelize = require('./db')
const models = require('./models/models')
const { getMessagesFromRoom } = require('./utils')

// создаем объект приложения
const app = express();

app.use(cors({ origin: "*" }))
app.use(router)

// Создание сервера
const PORT = process.env.PORT || 5000
const server = http.createServer(app)

const Admin = {
    name: "Admin"
}

// Установление двустороннего соединения с помощью сокетов
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

io.on('connection', (socket) => {
    // Событие подключения пользователя к комнате со стороны клиента
    socket.on('join', async ({ name, room }) => {
        // Подключение пользователя к комнате на сервере
        socket.join(room)

        const messagesHistory = await getMessagesFromRoom(room)

        // Если для комнаты был создат сответствующий экземпляр в бд, передадим сохраненные сообщения клиенту, иначе создадим экземпляр
        if(messagesHistory !== null) socket.emit('loadMessagesHistory', messagesHistory)
        else await models.Room.create({ name: room, data: [] })

        // Регистрация новых юзеров или фиксирование уже существующих
        const { user, isExist } = addUser({ name, room })

        // Сообщение пользователю при присоединении к комнате
        let toUserMessage = isExist ? `${user.name}, ты снова в чате!` : `Добро пожаловать, ${user.name}!`

        socket.emit('message', {data: { user: Admin, text: toUserMessage}})

        // Если пользователь уже был в комнате, это сообщение никому не придет
        !isExist && socket.broadcast.to(user.room).emit('message', {data: { user: { name: "Admin" }, text: `${user.name} присоединился к чату!`}})

        // Передача события присоединения к комнате клиенту
        io.to(user.room).emit('joinRoom', {data: { users: getRoomUsers(user.room)}})
    })

    // Событие отправки сообщений
    socket.on('sendMessage', async ({ message, params} ) => {
        // params представляет из себя объект с названием комнаты и текстом сообщения
        const user = params
        
        // Отправка сообщения всем пользователям в комнате отправителя
        io.to(params.room).emit('message', {data: { user, text: message}})

        const messagesHistory = await getMessagesFromRoom(params.room)

        // Сохранение нового сообщения в историю сообщений
        messagesHistory.push({ user, text: message })

        // Обновление экземпляра с новой историей сообщений
        await models.Room.update(
            {
                data: messagesHistory
            },
            {
                where: {
                    "name": params.room
                }
            }
        )
    })

    // Событие отключения от комнаты
    socket.on('leftRoom', (params) => {
        // params представляют из себя объект с именем пользователя и названием комнаты, где он находится
        const user = removeUser(params)

        if (user) {
            const { name, room } = user

            io.to(params.room).emit('message', {data: { user: Admin, text: `${name} покинул(а) комнату` }})
            io.to(params.room).emit('leftRoom', {data: { users: getRoomUsers(room) }})
        }
    })

    io.on('disconnect', () => console.log('Disconnected'))
})

const start = async () => {
    try {
        await sequelize.authenticate().catch(error => console.error(error))    // Подключение к бд
        await sequelize.sync()
        server.listen(PORT, () => console.log(`Server has been started on port ${PORT}`))

        // const data = []
        // data.push({text: "aaa", user: "Admin"})

        // const room1 = await models.Room.create({ name: "room3", data })

        // const room = await models.Room.findOne({
        //     raw: true,
        //     where: {
        //         "name": "room4"
        //     }
        // })
        // console.log("ROOM: ", room);
        // await room1.destroy()
        
    } catch (e) {
        console.log(e)
    }
}

start()
// server.listen(5000, () => console.log(`Server is running on ${PORT} port`));