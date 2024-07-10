// подключение express и модуля http
require('dotenv').config()
const express = require("express")
const { Server } = require('socket.io')
const cors = require('cors')
const http = require('http')

// БД
const sequelize = require('./db')
const models = require('./models/models')

const fs = require('fs')
const path = require('path');
const router = require('./router')
const { addUser, getRoomUsers, removeUser } = require('./user')
const { createHash } = require('crypto')
const { Readable } = require('stream');
const { finished } = require('node:stream/promises');
const { IMG, DOCS } = require('./directories')
const { filesDataTemplate } = require('./classes/filesData')
const { DatabaseService } = require('./API/DatabaseService')

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

// Отправка сообщения клиентам и в бд
const sendData = async (filesData, user, message) => {
    console.log("FILES ", filesData);
    console.log("DATA", {data: { user, text: message, filesData }});

    // Генерация уникального id для нового сообщения в комнате
    const id = await DatabaseService.generateMessageID(user.room)

    const messageData = { id, user, text: message, filesData }

    // Отправка сообщения всем пользователям в комнате отправителя
    io.to(user.room).emit('message', {data: messageData })

    

    // Обновление экземпляра с новой историей сообщений
    DatabaseService.updateMessagesHistory(user.room, messageData)
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

        const messagesHistory = await DatabaseService.getMessagesFromRoom(room)

        

        // Регистрация новых юзеров или фиксирование уже существующих
        const { user, isExist } = addUser({ name, room })

        // Сообщение пользователю при присоединении к комнате
        let toUserMessage = isExist ? `${user.name}, ты снова в чате!` : `Добро пожаловать, ${user.name}!`
        const welcomeMessage = { id: 0, user: Admin, text: toUserMessage, filesData: new filesDataTemplate() }
        // console.log("HISTORy", messagesHistory.push(welcomeMessage));

        // Если для комнаты был создат сответствующий экземпляр в бд, передадим сохраненные сообщения клиенту, иначе создадим экземпляр
        if(messagesHistory !== null) {
            messagesHistory.push(welcomeMessage)
            socket.emit('loadMessagesHistory', { data: messagesHistory })
        }
        else {
            await models.Room.create({ name: room, data: [] })

            socket.emit('message', { data: welcomeMessage })
        }


        // Если пользователь уже был в комнате, это сообщение никому не придет
        !isExist && socket.broadcast.to(user.room).emit('message', {data: { id: 0, user: { name: "Admin" }, text: `${user.name} присоединился к чату!`, filesData: new filesDataTemplate() }})

        // Передача события присоединения к комнате клиенту
        io.to(user.room).emit('joinRoom', {data: { users: getRoomUsers(user.room)}})
    })

    // Событие отправки сообщений
    socket.on('sendMessage', async ({ message, params, files = [] } ) => {
        // params представляет из себя объект с названием комнаты и текстом сообщения
        const user = params
        const countFiles = files.length
        const filesData = new filesDataTemplate()

        // Обработка файлов, если они есть
        if (countFiles) {
            files.forEach(async ({ id, name, type, buffer, size }, i) => {
                console.log('FILENAME ', name);

                const stream = Readable.from(buffer);
                const hash = createHash('md5')
                const dir = type.includes("image") ? IMG : DOCS
                const fileName = path.parse(name).name
                const fileExt = path.parse(name).ext
                let filePath = ''

                hash.setEncoding('hex')

                stream.on('end', function() {
                    hash.end();
                    const fileNameHashed = `${fileName}_${hash.read()}`

                    // Локальный путь до файла
                    filePath = `files/${dir}/${fileNameHashed}${fileExt}`
                    // глобальный путь до файла для клиентов
                    const myURL = `http://localhost:5000/${filePath}`

                    const fileData = { id, type: dir, size, url: myURL, fileName, fileExt }
                    
                    if (dir === IMG)
                        filesData.images.push( fileData )
                    else 
                        filesData.docs.push( fileData )

                    fs.writeFile(`./${filePath}`, buffer, "binary", err => {
                        if (err) console.log(err)
                    })
                });
                
                stream.pipe(hash)

                // После перебора всех файлов отправляем данные пользователям и сохраняем url файлов в бд
                if (i === countFiles - 1) {
                    // Сначала ожидаем пока закончится хеширование последнего файла
                    await finished(stream)
                    sendData(filesData, user, message)
                }
            })
        } else sendData(filesData, user, message)
    })

    // Событие отключения от комнаты
    socket.on('leftRoom', (params) => {
        // params представляют из себя объект с именем пользователя и названием комнаты, где он находится
        const user = removeUser(params)

        if (user) {
            const { name, room } = user

            // Сообшение о том, что кто-то покинул комнату
            io.to(params.room).emit('message', {
                data: { 
                    id: -1, 
                    user: Admin, 
                    text: `${name} покинул(а) комнату`, 
                    filesData: new filesDataTemplate() 
                } 
            })
            io.to(params.room).emit('leftRoom', { data: { users: getRoomUsers(room) } })
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