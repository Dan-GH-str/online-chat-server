const jwt = require('jsonwebtoken')

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token // Получаем токен из cookie

  if (!token) {
    return res.status(401).json({ message: 'Требуется аутентификация' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Ошибка верификации токена:", err) // Логирование для отладки
      return res.status(403).json({ message: 'Неверный токен' })
    }
    req.user = user // Добавляем информацию о пользователе в объект запроса
    next()
  })
}

module.exports = authenticateToken