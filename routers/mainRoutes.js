const express = require('express')
const router = express.Router()
const authenticateToken = require('../middleware/authMiddleware')
const { User, Room } = require('../models/models')
const { dispatchFile } = require('../utils')
const { DOCS, IMG } = require('../directories')
const { models } = require('../db')
const { Sequelize } = require('sequelize')

router.get('/', (req, res) => {
    // Отправка ответа
    res.send("RESPONSE")
})

router.get('/files/img/*', (req, res) => {
    dispatchFile(decodeURIComponent(req.url).substring(1), res, "img")
})

router.get('/files/docs/*', (req, res) => {
    dispatchFile(decodeURIComponent(req.url).substring(1), res, "doc")
})

// Получение актуальных названий директорий
router.get('/dirs', (req, res) => {
    res.send({ DOCS, IMG })
})

router.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Доступ разрешен', user: req.user })
})

// Получение всех чатов
router.get('/chats', async (req, res) => {
    try {
        const userId = req.query.whereNotInId
        const rooms = await Room.findAll({
            where: {
              id: {
                [Sequelize.Op.notIn]: Sequelize.literal(`(
                  SELECT "roomId"
                  FROM "UserRoom"
                  WHERE "UserId" = ${userId}
                )`)
              }
            }
          })
        
        // Отправляем список чатов
        res.json(rooms) // Sequelize создает поле `Rooms`, содержащее массив чатов
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server error' })
    }
})

// Получение чатов пользователя
router.get('/users/:userId/chats', async (req, res) => {
    try {
        const userId = req.params.userId
    
        const user = await User.findByPk(userId, {
            include: [Room] // Включаем связанные чаты
        })
    
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
    
        // Отправляем список чатов
        res.json(user.rooms) // Sequelize создает поле `Rooms`, содержащее массив чатов
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' })
    }
})

// Создание чата
router.post('/createChat', async (req, res) => {
    try {
        const { name } = req.body
        
        await Room.create({ name, data: [] })
        res.status(200).send('Chat created successfully')
    } catch (error) {
        console.error(error);
        
        res.status(500).send('Failed to create chat')
    }
})

module.exports = router