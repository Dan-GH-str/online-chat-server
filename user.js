const { trimStr } = require('./utils')

let users = []

const findUser = (user) => {
    const userName = trimStr(user.name)
    const userRoom = trimStr(user.room)

    return users.find((u) => trimStr(u.name) === userName && trimStr(u.room) === userRoom)
}

const addUser = (user) => {
    const found = findUser(user)

    !found && users.push(user)

    const currentUser = found || user

    return {isExist: !!found, user: currentUser}
}

const removeUser = (user) => {
    const found = findUser(user)

    if(found) {
        users = users.filter(u => (u.room === found.room && u.name !== found.name) || u.room !== found.room)
    }
    
    return found
}

const getRoomUsers = (room) => users.filter(u => u.room === room)

module.exports = { addUser, getRoomUsers, removeUser }