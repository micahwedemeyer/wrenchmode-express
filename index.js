function wrenchmodeExpress(options) {
  return function(req, res, next) {
    next();
  };
}

module.exports = wrenchmodeExpress;