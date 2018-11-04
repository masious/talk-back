const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');

const debug = require('debug')('talk-back:server');
const http = require('http');

const initIo = require('./routes/io');
const lib = require('./lib/init');
// const { renderError } = require('./lib/response');

const usersRouter = require('./routes/users');

const app = express();

app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'hbs');

const server = http.createServer(app);
app.set('trust proxy', '127.0.0.1');
app.set('view engine', 'jade');

app.set('jwtsecret', '&^76ysPNR!');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// lib({
//   app
// })

app.use('/users', usersRouter);

initIo(server, app);

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler                                                                                                                 
app.use(function (err, req, res, next) {
  console.error('in page', req.url);
  console.error(err);

  // set locals, only providing error in development                                                                             
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page                                                                                                       
  res.status(err.status || 500);
  res.render('error');
});

const port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort (val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
function normalizePort (val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}
function onError (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}
function onListening () {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}


module.exports = app;
