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
  const {
    username,
    email,
    password,
    welcomeMessage
  } = req.body

  const userData = {
    username,
    email,
    password,
    welcomeMessage
  }

  try {
    const user = await new User(userData)
    await user.save()

    const jwt = createJwt(user, req.app.get('jwtsecret'));
    const responseData = { ...user._doc, jwt };
    res.status(201).send(responseData);
  } catch (err) {
    next(createError(500, err));
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

    const results = user.conversations.map(conv => ({
      _id: String(conv.contact._id),
      username: conv.contact.username,
      lastSeen: conv.contact.lastSeen,
      unreadCount: conv.messages.length,
      photoUrl: conv.contact.photoUrl && `/images/${conv.contact.photoUrl}`,
      messages: [conv.lastMessage],
      conversationId: conv._id
    }))
      .reduce((prev, curr) => {
        prev[curr._id] = curr;
        return prev
      }, {});

    res.send(results);
  } catch (error) {
    next(error);
  }
})

router.post('/login', loginView);

router.get('/search', isAuthenticated, async function (req, res, next) {
  const { q: query } = req.query

  const user = await req.user.populate('conversations', 'contact').execPopulate();

  const friendIds = user.conversations
    .map(conv => conv.contact)

  try {
    const users = await User.find({
      username: {
        $regex: `^${query}`,
        $options: 'i'
      },
      _id: {
        $nin: [req.user._id, ...friendIds]
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
    if (newUserId === req.user._id) {
      res.status(403).send({ error: 'You can\'t add yourself!' });
      return;
    }

    const contact = await User.findById(newUserId)
    if (!contact) {
      res.status(404).send({ error: 'User not found' });
      return;
    }

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

    const userConversation = new Conversation({ contact });
    await userConversation.save();

    req.user.conversations.push(userConversation);
    await req.user.save();

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
    console.log(e);
    next(e);
  }
})

router.get('/conversation', isAuthenticated, async function (req, res, next) {
  try {
    const contact = await User
      .findOne({ username: req.query.userId })
      .select('_id username')

    const user = await req.user
      .populate({
        path: 'conversations',
        model: 'Conversation',
        match: {
          contact
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
      ...contact._doc,
      messages: user.conversations[0].messages.reverse()
    })
  } catch (e) {
    next(createError(500, e));
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
    next(createError(e))
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
