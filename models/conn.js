const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/talktome', { useNewUrlParser: true })
  .catch(err => {
    console.log('Database connection error:', err)
  })

module.exports = mongoose
