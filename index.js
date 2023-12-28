require('dotenv').config()
const express = require('express')
const http = require('http')
const cors = require('cors')
const {Server} = require('socket.io')
const router = require('./router')
const { addUser, getRoomUsers, removeUser } = require('./user')

const PORT = process.env.PORT
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})
const Admin = {
    name: "Admin"
}

io.on('connection', (socket) => {
    socket.on('join', ({ name, room }) => {
        socket.join(room)

        const { user, isExist } = addUser({ name, room})

        let toUserMessage = isExist ? `${user.name}, ты снова в чате!` : `Добро пожаловать, ${user.name}!`

        socket.emit('message', {data: { user: Admin, text: toUserMessage}})

        // Если пользователь уже был в комнате, это сообщение никому не придет
        !isExist && socket.broadcast.to(user.room).emit('message', {data: { user: { name: "Admin" }, text: `${user.name} присоединился к чату!`}})

        io.to(user.room).emit('joinRoom', {data: { users: getRoomUsers(user.room)}})
    })

    socket.on('sendMessage', ({ message, params} ) => {
        const user = params
        
        io.to(params.room).emit('message', {data: { user, text: message}})
    })

    socket.on('leftRoom', (params) => {
        const user = removeUser(params)

        if (user) {
            const { name, room } = user

            io.to(params.room).emit('message', {data: { user: Admin, text: `${name} покинул(а) комнату` }})
            io.to(params.room).emit('leftRoom', {data: { users: getRoomUsers(room) }})
        }
    })

    io.on('disconnect', () => console.log('Disconnected'))
})

app.use(cors({ origin: "*" }))
app.use(router)

server.listen(PORT, () => console.log(`Server has been started on PORT ${PORT}`))