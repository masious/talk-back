const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const createError = require('http-errors');
const router = express.Router();
const User = require('../models/user');
const Message = require('../models/message');
const { renderError } = require('../lib/response');
const Conversation = require('../models/conversation');
const { isAuthenticated } = require('../middlewares/auth');
const loginView = require('../views/login');
function createJwt (user, secret) {
  return jwt.sign({
    data: {
      _id: user._id
    }
  }, secret, {
      expiresIn: 60 * 60 * 24 * 30, // 1 month,
      algorithm: 'HS256'
    })
}

router.post('/create', async function (req, res, next) {
  const { username,
    email,
    password,
    photoUrl,
    welcomeMessage
  } = req.body

  const userData = {
    username,
    email,
    password,
    photoUrl,
    welcomeMessage
  }

  try {
    const user = await new User(userData)
    await user.save()

    const jwt = createJwt(user, req.app.get('jwtsecret'));
    const responseData = { ...user._doc, jwt };
    res.status(201).send(responseData);
  } catch (err) {
    createError(500, err)
  }
})

router.get('/contacts', isAuthenticated, async function (req, res, next) {
  try {
    const user = await req.user
    .populate({
      path: 'conversations',
      populate: [{
        path: 'contact',
        }, {
          // finding unread messages
          path: 'messages',
          match: {
            receiver: req.user,
            isSeen: false
          }
        }]
      })
      .execPopulate();

    await Promise.all(user.conversations.map(async conversation => {
      const conv = await Conversation
        .findById(conversation._id)
        .populate({
          path: 'messages',
          options: {
            limit: 1,
            sort: {
              receivedAt: '-1'
            }
          }
        });
      conversation.lastMessage = conv.messages[0];
    }));

    res.send(user.conversations.map(conv => ({
      username: conv.contact.username,
      _id: conv.contact._id,
      unreadCount: conv.messages.length,
      photoUrl: conv.contact.photoUrl && `/images/${conv.contact.photoUrl}`,
      lastMessage: conv.lastMessage,
      conversationId: conv._id
    })));
  } catch (error) {
    next(error);
  }
})

router.post('/login', loginView);

router.get('/search', async function (req, res, next) {
  const { q: query } = req.query

  try {
    const users = await User.find({
      username: {
        $regex: `^${query}`
      }
    }).select('_id username')

    res.send(JSON.stringify(users))
  } catch (e) {
    next(e)
  }
})

router.post('/add-contact', isAuthenticated, async function (req, res, next) {
  const { userId: newUserId } = req.body
  try {
    const user = await req.user.populate({
      path: 'conversations',
      match: {
        contact: newUserId
      }
    })
      .execPopulate();

    const alreadyExists = user.conversations.length > 0

    if (alreadyExists) {
      res.status(403).send({ error: 'Already added!' });
      return;
    }

    const userConversation = new Conversation({
      contact: newUserId
    });
    await userConversation.save();

    user.conversations.push(userConversation);
    await user.save();

    const contact = await User.findOne({ _id: newUserId });
    const contactConversation = new Conversation({
      contact: user
    });
    await contactConversation.save();
    contact.conversations.push(contactConversation);
    await contact.save();

    res.send({
      username: contact.username,
      _id: contact._id,
      unreadCount: 0,
      photoUrl: contact.photoUrl && `/images/${contact.photoUrl}`,
      lastMessage: {},
      conversationId: userConversation._id
    });
  } catch (e) {
    next(e);
  }
})

router.get('/conversation', isAuthenticated, async function (req, res, next) {
  try {
    const user = await req.user
      .populate({
        path: 'conversations',
        model: 'Conversation',
        match: {
          contact: req.query.userId
        },
        populate: {
          path: 'messages',
          model: 'Message',
          options: {
            limit: 15,
            sort: {
              receivedAt: -1
            }
          }
        }
      })
      .execPopulate();

    res.send({
      ...user.conversations[0],
      messages: user.conversations[0].messages.reverse()
    })
  } catch (e) {
    createError(500, e);
  }
});

router.post('/update', isAuthenticated, async function (req, res, next) {
  try {
    req.user.username = req.body.username
    req.user.welcomeMessage = req.body.welcomeMessage
    if (req.body.password && req.body.password.length > 0) {
      req.user.password = req.body.password
    }

    await req.user.save()

    const jwt = createJwt(req.user, req.app.get('jwtsecret'));

    res.send({ ...req.user._doc, jwt });
  } catch (e) {
    createError(e)
  }
});

const uploadStorage = multer.diskStorage({
  destination: (req, file, next) => {
    return next(null, 'public/images');
  },
  filename: (req, file, next) => {
    const ext = file.mimetype.split('/')[1];
    next(null, `${String(req.user._id)}.${ext}`);
  }
})
const upload = multer({
  storage: uploadStorage
})
router.post('/avatar',
  [isAuthenticated, upload.single('avatar')],
  async function (req, res, next) {
    req.user.photoUrl = req.file.filename;
    await req.user.save()

    res.send({
      photoUrl: `/images/${req.user.photoUrl}`
    })
  }
);

module.exports = router;
