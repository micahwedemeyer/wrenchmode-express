var opts = {
  forceOpen: false,
  ignoreTestMode: true,
  disableLocalWrench: false,
  statusProtocol: "https",
  statusHost: "wrenchmode.com",
  statusPath: "/api/projects/status",
  checkDelaySecs: 5,
  logging: false,
  readTimeoutSecs: 3
};

var jwt;
var statusUrl;

function wrenchmodeExpress(options) {
  Object.assign(opts, options);

  jwt = opts.jwt;
  statusUrl = opts.statusProtocol + "://" + opts.statusHost + opts.statusPath;

  // Set up the periodic status checking
  var currentStatus = {
    switched: false
  };
  setInterval(statusCheck.bind(this,currentStatus), opts.checkDelaySecs * 1000);

  return function(req, res, next) {
    if( !currentStatus.switched ) {
      next();
    } else {
      res.redirect(302, currentStatus.switchURL);
    }
  };
}

function statusCheck(currentStatus) {
  // Retrieve status from the WM server

  // Update the local status
  currentStatus.switched = true;
  currentStatus.switchURL = "http://example.com";
}

module.exports = wrenchmodeExpress;