const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { renderError } = require('../lib/response');

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

async function loginView (req, res, next) {
  console.log(req.body);
  try {
    const user = await User.findOne({
      $or: [{
        username: req.body.username,
        password: req.body.password
      }, {
        email: req.body.username,
        password: req.body.password
      }]
    });
    const jwt = createJwt(user, req.app.get('jwtsecret'));

    res.send({
      ...user._doc,
      jwt,
      photoUrl: user.photoUrl && `/images/${user.photoUrl}`
    });
  } catch (e) {
    next(e);
  }
};

module.exports = loginView;
