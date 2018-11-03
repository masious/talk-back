const mongoose = require('./conn');

const MessageSchema = new mongoose.Schema({
  body: String,
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },

  isSeen: {
    type: Boolean,
    default: false
  }
})

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
