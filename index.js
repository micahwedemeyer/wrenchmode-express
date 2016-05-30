var http = require('http');
var https = require('https');

const VERSION = "0.0.1";
const CLIENT_NAME = "wrenchmode-express";

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

function wrenchmodeExpress(options) {
  Object.assign(opts, options);

  // TODO : Error out if the jwt is not set

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
  retrieveStatus()
  .then(function(response) {
    updateStatus(currentStatus, response);
  })
  .catch(function(error) {
    currentStatus.switched = false;
  });
}

function retrieveStatus(currentStatus) {
  var options = {
    hostname: opts.statusHost,
    path: opts.statusPath,
    method: 'POST',
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": opts.jwt,
      "User-Agent": CLIENT_NAME + "-" + VERSION
    }
  };

  var protocol = opts.statusProtocol === 'http' ? http : https;

  return new Promise(function(resolve, reject) {
    var req = protocol.request(options, (res) => {
      // TODO: Check status code

      var responseBody = '';
      res.on('data', (d) => {
        responseBody += d;
      });

      res.on('end', () => {
        // TODO: Catch JSON parse error
        resolve(JSON.parse(responseBody));
      });
    });

    // TODO: Write the basic status info to the server in the POST body

    req.end();

    req.on('error', (e) => {
      reject(e);
    });
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