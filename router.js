const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
    // Отправка ответа
    res.send("RESPONSE")
})

module.exports = router