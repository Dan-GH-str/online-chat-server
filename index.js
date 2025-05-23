// Подключение express и модуля http
require('dotenv').config()
const express = require("express")
const { Server } = require('socket.io')
const cors = require('cors')
const http = require('http')
const cookieParser = require('cookie-parser')

// Routes
const authRoutes = require('./routers/authRoutes')
const mainRoutes = require('./routers/mainRoutes')

// БД
const sequelize = require('./db')
const models = require('./models/models')

const fs = require('fs')
const path = require('path')
const { createHash } = require('crypto')
const { Readable } = require('stream')
const { finished } = require('node:stream/promises')
const { IMG, DOCS } = require('./directories')
const { filesDataTemplate } = require('./classes/filesData')
const { DatabaseService } = require('./API/DatabaseService')
const { mkdir } = require('node:fs')

// создаем объект приложения
const app = express();

// Создание сервера
const PORT = process.env.PORT || 5000
const server = http.createServer(app)

app.use(cors({ 
    // origin: "https://my-online-chat.netlify.app",
    // origin: "http://localhost:3000",
    origin: process.env.CLIENT_HOSTING_URL,
    credentials: true
}))

app.use(express.json()) //  Обработка JSON-тела запроса
app.use(cookieParser()) // Используем cookie-parser

// app.use(router)

app.use('/auth', authRoutes) // Роуты аутентификации
app.use('/api', mainRoutes)  // основные API роуты (защищенные и открытые)

const Admin = {
    username: "Admin"
}

// Отправка сообщения клиентам и в бд
const sendData = async (filesData, params, message) => {
    console.log("FILES ", filesData);
    console.log("DATA", {data: { user: params.user, text: message, filesData }});

    // Генерация уникального id для нового сообщения в комнате
    const id = await DatabaseService.generateMessageID(params.room)

    const messageData = { id, user: params.user, text: message, filesData }

    // Отправка сообщения всем пользователям в комнате отправителя
    io.to(params.room).emit('message', {data: messageData })

    

    // Обновление экземпляра с новой историей сообщений
    DatabaseService.updateMessagesHistory(params.room, messageData)
}

// Установление двустороннего соединения с помощью сокетов
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8, pingTimeout: 60000
})

io.on('connection', (socket) => {
    // Событие подключения пользователя к комнате со стороны клиента
    socket.on('join', async ({ user: userData, room }) => {
        // Подключение пользователя к комнате на сервере
        socket.join(room)

        const messagesHistory = await DatabaseService.getMessagesFromRoom(room)

        const user = await models.User.findByPk(userData.userId)
        const chat = await models.Room.findOne({ where: { name: room } })

        if (!user || !chat) {
            socket.emit('error', { message: 'Пользователь или комната не найдены' });
        }

        // console.log(user);
        

        // Проверяем, существует ли уже связь между пользователем и чатом
        const hasChat = await user.hasRoom(chat)

        // Сообщение пользователю при присоединении к комнате
        let toUserMessage = hasChat ? `${userData.username}, ты снова в чате!` : `Добро пожаловать, ${userData.username}!`
        const welcomeMessage = { id: 0, user: Admin, text: toUserMessage, filesData: new filesDataTemplate() }

        await user.addRoom(chat)
        
        if (!hasChat) {
            await chat.increment({ countOfUsers: 1 })
            await chat.reload()
        }

        messagesHistory.push(welcomeMessage)
        socket.emit('loadMessagesHistory', { data: messagesHistory })


        // Если пользователь уже был в комнате, это сообщение никому не придет
        !hasChat && socket.broadcast.to(room).emit('message', {data: { id: 0, user: Admin, text: `${user.username} присоединился к чату!`, filesData: new filesDataTemplate() }})
            
        // Передача события присоединения к комнате клиенту
        io.to(room).emit('joinRoom', { data: { countOfUsers: chat.countOfUsers } })
    })

    // Событие отправки сообщений
    socket.on('sendMessage', async ({ message, params, files = [] } ) => {
        // params представляет из себя объект с названием комнаты и текстом сообщения
        const countFiles = files.length
        const filesData = new filesDataTemplate()
        console.log("SENDMESSAGE");
        
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

                    // Локальные пути до файла
                    const RelativeFilePath = `files/${dir}/${fileNameHashed}${fileExt}`
                    const AbsoluteFilePath = __dirname + '/' + RelativeFilePath
                    // глобальный путь до файла для клиентов
                    // const myURL = `http://localhost:5000/api/${RelativeFilePath}`
                    const myURL = `${process.env.SERVER_URL}/api/${RelativeFilePath}`

                    // console.log("RelativeFilePath: ", RelativeFilePath);
                    console.log("myURL: ", myURL);
                    

                    const fileData = { id, type: dir, size, url: myURL, fileName, fileExt }
                    
                    if (dir === IMG)
                        filesData.images.push( fileData )
                    else 
                        filesData.docs.push( fileData )

                    // fs.writeFile(`${filePath}`, buffer, "binary", err => {
                    //     if (err) console.log(err)
                    // })

                    mkdir(path.dirname('./' + RelativeFilePath), { recursive: true } ,(err) => {
                        if (err) console.log(err)
                    
                        fs.writeFile(`${AbsoluteFilePath}`, buffer, "binary", err => {
                            if (err) console.log(err)
                        })
                    })
                })
                
                stream.pipe(hash)

                // После перебора всех файлов отправляем данные пользователям и сохраняем url файлов в бд
                if (i === countFiles - 1) {
                    // Сначала ожидаем пока закончится хеширование последнего файла
                    await finished(stream)
                    sendData(filesData, params, message)
                }
            })
        } else sendData(filesData, params, message)
    })

    // Событие отключения от комнаты
    socket.on('leftRoom', async (params) => {
        // params представляют из себя объект с именем пользователя (user) и названием комнаты (room), где он находится

        try {
            const user = await models.User.findByPk(params.user.userId)
            const chat = await models.Room.findOne({ where: { name: params.room } })

            if (user) {
                // Сообшение о том, что кто-то покинул комнату
                io.to(params.room).emit('message', {
                    data: { 
                        id: -1, 
                        user: Admin, 
                        text: `${user.username} покинул(а) чат`, 
                        filesData: new filesDataTemplate() 
                    } 
                })

                await user.removeRoom(chat)

                await chat.decrement({ countOfUsers: 1 })
                await chat.reload()

                io.to(params.room).emit('leftRoom', { data: { countOfUsers: chat.countOfUsers } })
            }

        } catch (error) {
            console.error(error);
        }
    })

    io.on('disconnect', () => console.log('Disconnected'))
})

const start = async () => {
    try {
        await sequelize.authenticate().catch(error => console.error(error))    // Подключение к бд
        await sequelize.sync()
        server.listen(PORT, () => console.log(`Server has been started on port ${PORT}`))
    } catch (e) {
        console.log(e)
    }
}

start()