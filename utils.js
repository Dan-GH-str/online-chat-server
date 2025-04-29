const fs = require("fs");
const path = require('path');

const trimStr = (str) => str.trim().toLowerCase()

const dispatchFile = (reqPath, res, type) => {
    fs.access(reqPath, fs.constants.R_OK, (err) => {
        console.log("REQPATH: ", reqPath);
        
        // если произошла ошибка - отправляем статусный код 404
        if (err) {
            console.error(err)
            res.statusCode = 404
            res.end("Resourse not found!")
        } else {
            const filePath = path.join(__dirname, reqPath)

            console.log("PATH", filePath);

            if (type === "img") res.sendFile(filePath)
            else if (type === "doc") {
                const fileName =  path.basename(filePath)
                const fileExt = path.parse(fileName).ext

                res.download(filePath, fileName.slice(0, fileName.lastIndexOf("_")) + fileExt)
            }
    }})
}

module.exports = {
    trimStr,
    dispatchFile
}