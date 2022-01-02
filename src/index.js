const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users.js')

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');
const app = express();
app.use(express.static(publicDirectoryPath));

const server = http.createServer(app);
const io = new socketio.Server(server);

io.on('connection', (socket) => {
    console.log('New websocket connection!');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        
        if(error) {
            return callback(error)
        }

        socket.join(user.room);
        
        socket.emit('message', generateMessage('Welcome!'));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()

        // socket.emit, io.emit, socket.broadcast.emit
        // io.to.emit, socket.broadcast.to.emit
    });

    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)

        if(user) {
            const filter = new Filter();
            if(filter.isProfane(msg)){
                return callback('Bad language not allowed')
            }
    
            io.to(user.room).emit('message', generateMessage(user.username, msg));
            callback();
        }
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the room.`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });

    socket.on('Send-location', (coords, callback) => {
        const user = getUser(socket.id)

        if(user){
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
            callback()
        }
    });
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
});