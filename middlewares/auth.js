const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function isAuthenticated (req, res, next) {
  const header = req.header('Authorization');
  if (!header) {
    next(createError(403, 'No authorization header'));
    return;
  }
  token = header.substr('Bearer '.length)
    const { data } = jwt.verify(token, req.app.get('jwtsecret'));
    try {
      req.user = await User.findOne({
        _id: data._id
      })
      next()
    } catch (err) {
      next(createError(401, 'No user found'));
    }
}

module.exports = { isAuthenticated }