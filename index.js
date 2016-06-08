var http = require('http');
var https = require('https');
var os = require('os');
var process = require('process');
var Netmask = require('netmask').Netmask;

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
    switchUrl: null,
    ipWhitelist: []
  };
  statusCheckLoop(currentStatus, opts);

  return function(req, res, next) {
    var shouldShowSwitch = currentStatus.switched && !opts.forceOpen && !isIpWhitelisted(req, currentStatus);
    if( shouldShowSwitch ) {
      res.redirect(302, currentStatus.switchUrl);
    } else {
      next();
    }
  };
}

function statusCheckLoop(currentStatus, opts) {
  retrieveStatus(opts)
  .then(function(response) {
    updateStatus(currentStatus, response);
  })
  .catch(function(error) {
    currentStatus.switched = false;
  })
  .then(function() {
    setTimeout(statusCheckLoop.bind(this, currentStatus, opts), opts.checkDelaySecs * 1000);
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

    req.write(JSON.stringify(buildUpdatePackage()));
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
    currentStatus.ipWhitelist = serverResponse.ip_whitelist || [];
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

function isIpWhitelisted(req, currentStatus) {
  var whitelisted = false;
  try {
    currentStatus.ipWhitelist.forEach(function(whitelisted_ip) {
      var block = new Netmask(whitelisted_ip);
      if(block.contains(req.ip)) {
        whitelisted = true
      }
    });
  } catch (e) {
    // Do nothing? As long as we return true/false, everything should be okay...
  }
  return whitelisted;
}

module.exports = wrenchmodeExpress;