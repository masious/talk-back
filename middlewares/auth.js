const jwt = require('jsonwebtoken');
const User = require('../models/user');

async function isAuthenticated (req, res, next) {
  const header = req.header('Authorization');
  if (!header) {
    next({
      status: 403,
      message: 'No Authorization header'
    });
    return 
  }
  token = header.substr('Bearer '.length)
    const { data } = jwt.verify(token, req.app.get('jwtsecret'));
    try {
      req.user = await User.findOne({
        _id: data._id
      })
      next()
    } catch (err) {
      next({
        status: 403,
        message: 'No user found'
      })
    }
}

module.exports = { isAuthenticated }