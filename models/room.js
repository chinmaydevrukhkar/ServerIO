const mongoose = require("mongoose");
const playerSchema = require("./player");

const roomSchema = new mongoose.Schema({
  occupancy: {
    type: Number,
    default: 2,
  },
  maxRounds: {
    type: Number,
    default: 6,
  },
  currentRound: {
    required: true,
    type: Number,
    default: 1,
  },
  players: [playerSchema],
  isJoin: {
    type: Boolean,
    default: true,
  },
  turn: playerSchema,
  turnIndex: {
    type: Number,
    default: 0,
  },
  roomCode: {
    type: String,
    unique: true,
  },
});

// Pre-save hook to generate a short, unique roomCode
roomSchema.pre('save', async function (next) {
    if (!this.roomCode) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code;
      let isUnique = false;
  
      while (!isUnique) {
        code = Array.from({ length: 6 }, () =>
          characters.charAt(Math.floor(Math.random() * characters.length))
        ).join('');
  
        const existing = await mongoose.models.Room.findOne({ roomCode: code });
        if (!existing) {
          isUnique = true;
        }
      }
  
      this.roomCode = code;
    }
  
    next();
  });
  

const roomModel = mongoose.model("Room", roomSchema);
module.exports = roomModel;
