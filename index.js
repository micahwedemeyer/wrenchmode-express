var http = require('http');
var https = require('https');
var os = require('os');
var process = require('process');

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
    switched: false,
    checkInProgress: false,
    switchURL: null
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
  if(!currentStatus.checkInProgress) {
    currentStatus.checkInProgress = true;
    retrieveStatus()
    .then(function(response) {
      updateStatus(currentStatus, response);
      currentStatus.checkInProgress = false;
    })
    .catch(function(error) {
      currentStatus.switched = false;
      currentStatus.checkInProgress = false;
    });
  }
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
      if (res.statusCode !== 200) {
        reject("HTTP Status: " + res.statusCode);
      }

      var responseBody = '';
      res.on('data', (d) => {
        responseBody += d;
      });

      res.on('end', () => {
        // TODO: Catch JSON parse error
        resolve(JSON.parse(responseBody));
      });
    });
    req.setTimeout(opts.readTimeoutSecs * 1000);

    req.write(JSON.stringify(buildUpdatePackage));
    req.end();

    req.on('error', (e) => {
      reject(e);
    });
    req.on('timeout', (e) => {
      reject(e);
    })
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

function buildUpdatePackage() {
  return {
    hostname: os.hostname(),
    ip_address: "127.0.0.1",
    pid: process.pid,
    client_name: CLIENT_NAME,
    client_version: VERSION

  }
}

module.exports = wrenchmodeExpress;