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
     socket.on('createRoom', async({nickname})=>{
         console.log(nickname);
         //room is created
         try{
         let room = new Room();
         let player = {
             socketID: socket.id,
             nickname,
             playerType: 'X',
         };
 
         room.players.push(player);
         room.turn = player;
 
         room = await room.save(); //save to db
         console.log(room);
         const roomId = room._id.toString();
 
         socket.join(roomId);
         // Tell our client that room has been created, go to the next page
         io.to(roomId).emit("createRoomSuccess", room);
         }catch(e){
             console.log(e);
         }
     });
 
     socket.on('joinRoom', async({nickname, roomId})=>{
         try{
             if(!roomId.match(/^[0-9a-fA-F]{24}$/)){
                 socket.emit('errorOccured', 'Please enter a valid Room ID.');
                 return;
             }
             let room = await Room.findById(roomId);
              
             if(room.isJoin){
                 let player ={
                     nickname,
                     socketID: socket.id,
                     playerType: 'O',
                 }
                 socket.join(roomId);
                 room.players.push(player);
                 room.isJoin = false;
                 room = await room.save();
                 // Tell our client that room has been created, go to the next page
                 io.to(roomId).emit("joinRoomSuccess", room);
                 io.to(roomId).emit("updatePlayers", room.players);
                 io.to(roomId).emit("updateRoom", room);
 
 
             }else{
                 socket.emit('errorOccured', 'The game is in Progress, try again later')
             }
         }catch(e){
             console.log(e);
         }
     });
 
     socket.on('tap', async({index, roomId})=>{
         try{
             let room = await Room.findById(roomId);
             let choice = room.turn.playerType; // X or O
             if(room.turnIndex == 0){
                 room.turn = room.players[1];
                 room.turnIndex = 1;
             }
             else{
                 room.turn = room.players[0];
                 room.turnIndex = 0;
     
             }
             room = await room.save();
             
             io.to(roomId).emit('tapped', {
                 index,
                 choice,
                 room,
             });
     
         }catch(e){
             console.log(e);
         }
     
     });
 
 
     socket.on('winner', async({winnerSocketId, roomId})=>{
         try{
             let room = await Room.findById(roomId);
             let player = room.players.find((player)=> player.socketID == winnerSocketId);
             player.points+=1;
             room = await room.save();
             if(player.points >= room.maxRound){
                 io.to(roomId).emit('endGame', player);
             }
             else{
                 io.to(roomId).emit('pointIncrease', player);
             }
         }catch(e){
             console.log(e);
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
 
 
 
 
 
 
