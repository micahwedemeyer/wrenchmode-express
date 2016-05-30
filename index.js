var http = require('http');
var https = require('https');

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
  currentStatus.switchUrl = "http://example.com";
}

function retrieveStatus(currentStatus) {
  var options = {
    hostname: opts.statusHost,
    path: opts.statusPath,
    method: 'POST'
  };

  // TODO: Set the JWT in the header

  var protocol = statusProtocol === 'http' ? http : https;
  var req = protocol.request(options, (res) => {
    // TODO: Check status code

    var responseBody = '';
    res.on('data', (d) => {
      responseBody += d;
    });

    res.on('end', () => {
      // TODO: Catch JSON parse error
      updateStatus(currentStatus, JSON.parse(responseBody));
    });
  });

  // TODO: Write the basic status info to the server in the POST body

  req.end();

  req.on('error', (e) => {
    currentStatus.switched = false;
  });
}

function updateStatus(currentStatus, serverResponse) {
  if(serverResponse.is_switched) {
    currentStatus.switched = true;
    currentStatus.switchUrl = serverResponse.switch_url;
  } else {
    currentStatus.switched = false;
  }
}

module.exports = wrenchmodeExpress;