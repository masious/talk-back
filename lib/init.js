const Mustache = require('mustache');
const { setResponse } = require('./response');

function initMaker () {
  let app;

  let settings;
  const defaultSettings = {
    templateEngine: Mustache
  };

  return function init ({ app: givenApp, settings: userSettings }) {
    app = givenApp

    settings = {
      ...defaultSettings,
      ...userSettings
    }

    app.settings = settings

    app.use(function (req, res, next) {
      setResponse(res)
      next()
    });
  }
}

module.exports = initMaker();
