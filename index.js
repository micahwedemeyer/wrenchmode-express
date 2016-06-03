var http = require('http');
var https = require('https');
var os = require('os');
var process = require('process');

const VERSION = "0.0.1";
const CLIENT_NAME = "wrenchmode-express";

function wrenchmodeExpress(options) {

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

  Object.assign(opts, options);

  if(!opts.jwt) {
    throw new Error("You must set the jwt for the wrenchmodeExpress middleware. Please see the README for more info.");
  }

  // Set up the periodic status checking
  var currentStatus = {
    switched: false,
    switchURL: null
  };
  scheduleStatusCheck(currentStatus, opts);

  return function(req, res, next) {
    if( !currentStatus.switched ) {
      next();
    } else {
      res.redirect(302, currentStatus.switchURL);
    }
  };
}

function scheduleStatusCheck(currentStatus, opts) {
  setTimeout(statusCheck.bind(this, currentStatus, opts), opts.checkDelaySecs * 1000);
}

function statusCheck(currentStatus, opts) {
  retrieveStatus(opts)
  .then(function(response) {
    updateStatus(currentStatus, response);
  })
  .catch(function(error) {
    currentStatus.switched = false;
  })
  .then(function() {
    scheduleStatusCheck(currentStatus, opts);
  })
}

function retrieveStatus(opts) {
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
        return reject(new Error("HTTP Status: " + res.statusCode));
      }

      var responseBody = '';
      res.on('data', (d) => {
        responseBody += d;
      });

      res.on('end', () => {
        var json = null;
        try {
          json = JSON.parse(responseBody);
        } catch (e) {
          reject(e);
        }

        return resolve(json);
      });
    });
    req.setTimeout(opts.readTimeoutSecs * 1000);

    req.write(JSON.stringify(buildUpdatePackage));
    req.end();

    req.on('error', (e) => {
      return reject(e);
    });
    req.on('timeout', (e) => {
      return reject(e);
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