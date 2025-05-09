// Обработчик роутеров регистрации и входа

const { User } = require('../models/models')
const jwt = require('jsonwebtoken')

const generateToken = (user) => {
    return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION,
    })
}

const setCookies = (res, token) => {
    const cookieOptions = {
        httpOnly: true, // Предотвращает доступ JavaScript
        // secure: process.env.NODE_ENV === 'production', // Только для HTTPS в production
        secure: true,
        sameSite: 'None', //  Защита от CSRF (лучше всего 'Strict', но необходимы доп настройки???)
        maxAge: process.env.JWT_EXPIRATION * 1000, // Срок действия cookie (в миллисекундах)
        path: '/' // Куда можно отправлять этот cookie
    }
    
    // Установка JWT в качестве HTTP-only cookie
    res.cookie('token', token, cookieOptions)
}

const register = async (req, res) => {
    try {
        console.log(req.body);
        
        const { username, password } = req.body

        // Проверка на существование пользователя с таким же username
        const existingUser = await User.findOne({ where: { username } })
        if (existingUser) {
            return res.status(400).json({ message: 'Username уже занят' })
        }

        const user = await User.create({ username, password })
        const token = generateToken(user)

        setCookies(res, token)
        res.status(201).json({ user: { userId: user.id, username: user.username }  })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Ошибка при регистрации пользователя' })
    }
}

const login = async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findOne({ where: { username } })

        if (!user) {
        return res.status(401).json({ message: 'Неверный username или пароль' })
        }

        const validPassword = await user.validPassword(password)

        if (!validPassword) {
        return res.status(401).json({ message: 'Неверный username или пароль' })
        }

        const token = generateToken(user)

        setCookies(res, token)
        res.json({ message: 'Вход выполнен успешно', user: { userId: user.id, username: user.username } })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Ошибка при входе' })
    }
}

const logout = (req, res) => {
    // Очищаем куки при выходе
    res.clearCookie('token', { path: '/' });
    res.json({ message: 'Вы вышли из системы' });
}

module.exports = { authController: { register, login, logout } }