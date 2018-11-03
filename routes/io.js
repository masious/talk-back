const jwt = require('jsonwebtoken');
const socketIo = require('socket.io');
const User = require('../models/user');
const Message = require('../models/message');

async function updateLastSeen (user) {
  if ((new Date()).getTime() - user.lastSeen.getTime() > 2000) {
    user.lastSeen = new Date();
    await user.save();
  }
}


function listen (server, app) {
  const io = socketIo(server);
  io._openSockets = {}

  setInterval(function updateLastSeens () {
    Object.keys(io._openSockets)
      .map(userId => io._openSockets[userId].user)
      .forEach(async user => {
        await updateLastSeen(user)
      })
  }, 5000);

  let lastSeenTimeout
  io.on('connection', async function connected (socket) {
    const { token } = socket.handshake.query;
    const { data } = jwt.verify(token, app.get('jwtsecret'));
    if (data) {
      try {
        socket.user = await User.findOne({
          _id: data._id
        });

        socket.user.status = 'online';
        await updateLastSeen(socket.user);

        io._openSockets[data._id] = socket
      } catch (e) {
        console.error(e)
        return
      }
    }

    socket.on('disconnect', async function disconnected () {
      delete io._openSockets[String(socket.user._id)]
      socket.user.status = 'offline'
      await socket.user.save()

      console.log('user disconnected');
    });

    socket.on('chat message', async function (msg) {
      try {
        const receiver = await User.findOne({ _id: msg.receiverId })
          .populate({
            path: 'conversations',
            match: {
              contact: socket.user._id
            }
          })

        const message = new Message({
          sender: socket.user._id,
          receiver: receiver._id,
          body: msg.body
        });
        await message.save();

        const receiverConversation = receiver.conversations[0];
        receiverConversation.messages.push(message)
        await receiverConversation.save()

        const user = await socket.user.populate({
          path: 'conversations',
          match: {
            contact: msg.receiverId
          }
        })
          .execPopulate()

        const userConversation = user.conversations[0];
        userConversation.messages.push(message);
        await userConversation.save()

        const receiverId = String(receiver._id);
        if (io._openSockets[receiverId]) {
          io._openSockets[receiverId].emit('new message', {
            conversationId: receiverConversation._id,
            message
          });
        }

        io._openSockets[String(user._id)].emit('new message', {
          conversationId: userConversation._id,
          message
        });
      } catch (e) {
        console.error(e)
      }
    });

    socket.on('mark seen', async function (messageId) {
      const message = await Message.findById(messageId)
      message.isSeen = true;
      await message.save();

      io._openSockets[String(message.sender._id)]
        .emit('marked seen', message._doc);

      socket.emit('marked seen', message._doc);
    });

    socket.on('getLastSeen', async function (userId, cb) {
      const user = await User.findById(userId);
      cb(user.lastSeen);
    });
  });
}

module.exports = listen