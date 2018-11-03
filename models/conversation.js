const mongoose = require('./conn');

const ConversationSchema = new mongoose.Schema({
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }]
});

const Conversation = mongoose.model('Conversation', ConversationSchema);
module.exports = Conversation;
