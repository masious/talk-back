const mongoose = require('./conn');
const ConversationSchema = require('./conversation');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    validate: {
      isAsync: true,
      validator: function (value, done) {
        if (!this.isNew) {
          return done(true)
        }

        this.model('User').count({ username: value }, function (err, count) {
          if (err) {
            return done(err);
          }
          done(!count);
        })
      },
      message: props => `Username ${props.value} already exists!`
    }
  },
  email: {
    type: String,
    validate: {
      isAsync: true,
      validator: function (value, done) {
        if (!this.isNew) {
          return done(true)
        }

        this.model('User').count({ email: value }, function (err, count) {
          if (err) {
            return done(err);
          }
          done(!count);
        })
      },
      message: props => `Email ${props.value} already exists!`
    }
  },
  status: {
    type: String,
    enum: ['online', 'offline']
  },
  password: String,
  photoUrl: String,
  welcomeMessage: String,
  lastSeen: {
    type: Date,
    default: Date.now
  },
  socketId: Number,
  conversations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const User = mongoose.model('User', UserSchema);

module.exports = User
