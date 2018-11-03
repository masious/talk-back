const fs = require('fs');
const Mustache = require('mustache');

let response;

const HTTP_CODES = {
  OK: 200,
  CREATED: 201
}

function renderTemplate (res, templateAddress, context, statusCode) {
  fs.readFile(templateAddress, 'utf8', function (err, template) {
    if (err) {
      console.log('ERROR', err);
    }

    const html = Mustache.render(template, context);
    res.status(statusCode || HTTP_CODES.OK)
    .type('html')
      .end(html);
  })
}

function setResponse (res) {
  response = res;

  res.___renderTemplate = renderTemplate;

}

function renderError (res, { statusCode = 500, error }) {
  const stackTrace = {}

  Error.captureStackTrace(stackTrace)
  renderTemplate(res, './lib/templates/error.html', {
    error: JSON.stringify(error),
    statusCode: statusCode,
    trace: JSON.stringify(stackTrace)
  }, statusCode);
}

module.exports = {
  HTTP_CODES,
  setResponse,
  renderError
}
