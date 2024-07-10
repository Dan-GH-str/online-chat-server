const express = require('express')
const router = express.Router()
const { dispatchFile } = require('./utils')
const { DOCS, IMG } = require('./directories')

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

router.get('/dirs', (req, res) => {
    res.send({ DOCS, IMG })
})

module.exports = router