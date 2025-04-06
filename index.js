require("dotenv").config();
const exp = require("constants");
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");

const app = express();
const port = process.env.PORT || 3000;
var server = http.createServer(app);
const Room = require("./models/room");
var io = require("socket.io")(server);

//middleware
app.use(express.json());

io.on('connection', (socket)=>{
    console.log("connected");
    socket.on('createRoom', async ({ nickname }) => {
        console.log(nickname);
        try {
            let room = new Room(); // Create a new room document
            let player = {
                socketID: socket.id,
                nickname,
                playerType: 'X',
            };
    
            room.players.push(player);
            room.turn = player;
    
            room = await room.save(); // Save to database
            console.log(room);
            const roomCode = room.roomCode; // Use the short roomCode
    
            socket.join(roomCode);
            // Tell the client that the room has been created
            io.to(roomCode).emit("createRoomSuccess", room);
        } catch (e) {
            console.log(e);
        }
    });
    

    socket.on('joinRoom', async ({ nickname, roomCode }) => {
        try {
            let room = await Room.findOne({ roomCode });
    
            if (!room) {
                socket.emit('errorOccurred', 'Invalid Room Code. Please check and try again.');
                return;
            }
    
            if (!room.isJoin) {
                socket.emit('errorOccurred', 'The game is in progress. Try again later.');
                return;
            }
    
            let player = {
                nickname,
                socketID: socket.id,
                playerType: 'O',
            };
    
            socket.join(roomCode);
            room.players.push(player);
            room.isJoin = false;
            room = await room.save();
    
            // Notify clients about room updates
            io.to(roomCode).emit("joinRoomSuccess", room);
            io.to(roomCode).emit("updatePlayers", room.players);
            io.to(roomCode).emit("updateRoom", room);
    
        } catch (e) {
            console.error("Error joining room:", e);
            socket.emit('errorOccurred', 'Failed to join the room. Please try again.');
        }
    });
    
    
    socket.on('tap', async ({ index, roomCode }) => {
        try {
            let room = await Room.findOne({ roomCode });
    
            if (!room) {
                socket.emit('errorOccurred', 'Invalid Room Code.');
                return;
            }
    
            let choice = room.turn.playerType; // X or O
    
            // Switch turn between players
            room.turnIndex = room.turnIndex === 0 ? 1 : 0;
            room.turn = room.players[room.turnIndex];
    
            room = await room.save();
    
            // Notify clients about the move
            io.to(roomCode).emit('tapped', {
                index,
                choice,
                room,
            });
    
        } catch (e) {
            console.error("Error processing tap event:", e);
            socket.emit('errorOccurred', 'Something went wrong. Please try again.');
        }
    });
    
    
    socket.on('winner', async ({ winnerSocketId, roomCode }) => {
        try {
            let room = await Room.findOne({ roomCode });
    
            if (!room) {
                socket.emit('errorOccurred', 'Invalid Room Code.');
                return;
            }
    
            let player = room.players.find(player => player.socketID === winnerSocketId);
            if (!player) {
                socket.emit('errorOccurred', 'Winner not found.');
                return;
            }
    
            player.points = (player.points || 0) + 1;
            room = await room.save();
    
            if (player.points >= room.maxRound) {
                io.to(roomCode).emit('endGame', player);
            } else {
                io.to(roomCode).emit('pointIncrease', player);
            }
    
        } catch (e) {
            console.error("Error processing winner event:", e);
            socket.emit('errorOccurred', 'Something went wrong. Please try again.');
        }
    });
    
    
});




mongoose.connect(process.env.MONGODB_URL).then(()=>{
    console.log("Connection successful");
}).catch((e)=> {
    console.log(e);
})

server.listen(port, '0.0.0.0', () => {
    console.log(`Server started and running on port ${port}`);
});






