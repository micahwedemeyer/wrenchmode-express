"use strict";

var assert = require('chai').assert;
var httpMocks = require('node-mocks-http');
var nock = require('nock');

var wrenchmodeExpress = require('../index');

const WRENCHMODE_STATUS_HOST = "https://wrenchmode.com";
const WRENCHMODE_STATUS_PATH = "/api/projects/status";

var request, response = {};
var scope;

describe("WrenchmodeExpress", function() {
  beforeEach(function() {
    nock.cleanAll();
  });

  describe("basic operation", function() {
    beforeEach(function() {
      request = httpMocks.createRequest({
        method: 'GET',
        url: '/myapp/somepath'
      });
      request.ip = "127.0.0.1";
      response = httpMocks.createResponse();
    });

    it("should call the next middleware in the chain", function(done) {
      wrenchmodeExpress({jwt: "foo"})(request, response, function() {
        done();
      });
    });

    it("should throw an error if the jwt is not set", function() {
      assert.throws(function() {
        wrenchmodeExpress({});
      }, Error, /must set the jwt/);
    });
  });

  describe("in wrenchmode", function() {
    beforeEach(function() {
      request = httpMocks.createRequest({
        method: 'GET',
        url: '/myapp/somepath'
      });
      request.ip = "127.0.0.1";
      response = httpMocks.createResponse();

      scope = nock(WRENCHMODE_STATUS_HOST)
      .persist()
      .post(WRENCHMODE_STATUS_PATH)
      .reply(200, {
        is_switched: true,
        switch_url: "https://myproject.wrenchmode.com/maintenance",
        ip_whitelist: [
          "192.168.0.1/24",
          "10.20.0.0/32"
        ]
      });
    });

    it("should redirect to Wrenchmode", function(done) {
      let options = {
        jwt: "foo",
        checkDelaySecs: 0.001
      };

      let middleware = wrenchmodeExpress(options);

      // Give it a little time to get a response from our fake Wrenchmode server
      setTimeout(function() {
        middleware(request, response, function() {})
        assert(scope.isDone());
        assert.equal(302, response.statusCode);
        done();
      }, 30);
    });

    it("should allow a request through if forceOpen is true", function(done) {
      let options = {
        jwt: "foo",
        checkDelaySecs: 0.001,
        forceOpen: true
      };

      let middleware = wrenchmodeExpress(options);

      // Give it a little time to get a response from our fake Wrenchmode server
      setTimeout(function() {
        middleware(request, response, function() {})
        assert(scope.isDone());
        assert.equal(200, response.statusCode);
        done();
      }, 30);
    });

    it("should allow a request through if the IP is whitelisted", function(done) {
      let options = {
        jwt: "foo",
        checkDelaySecs: 0.001
      };

      let middleware = wrenchmodeExpress(options);

      let allowedIps = [
          "192.168.0.1",
          "192.168.0.20",
          "192.168.0.255",
          "10.20.0.0"
      ];

      setTimeout(function() {
        allowedIps.forEach(function(ip) {
          request.ip = ip;
          middleware(request, response, function() {})
          assert.equal(200, response.statusCode);
        });
        done();
      }, 30);
    });


    it("should redirect to Wrenchmode if the IP is not whitelisted", function(done) {
      let options = {
        jwt: "foo",
        checkDelaySecs: 0.001
      };

      let middleware = wrenchmodeExpress(options);

      let rejectedIps = [
        "127.0.0.1",
        "192.168.1.0",
        "10.20.0.1"
      ];

      setTimeout(function() {
        rejectedIps.forEach(function(ip) {
          request.ip = ip;
          middleware(request, response, function() {})
          assert.equal(302, response.statusCode);
        });
        done();
      }, 30);
    });
  });

  describe("when an error occurs, like", function() {
    beforeEach(function() {
      request = httpMocks.createRequest({
        method: 'GET',
        url: '/myapp/somepath'
      });
      response = httpMocks.createResponse();
    });

    describe("a timeout to Wrenchmode", function() {
      beforeEach(function() {
        scope = nock(WRENCHMODE_STATUS_HOST)
        .persist()
        .post(WRENCHMODE_STATUS_PATH)
        .delay(500)
        .reply(200, {
          is_switched: true,
          switch_url: "https://myproject.wrenchmode.com/maintenance"
        });
      });

      it("should allow the request to go through", function(done) {
        let options = {
          jwt: "foo",
          checkDelaySecs: 0.1,
          readTimeoutSecs: 0.1
        };

        let middleware = wrenchmodeExpress(options);

        // It will timeout and then respond with a 200
        setTimeout(function() {
          middleware(request, response, function() {})
          assert.equal(200, response.statusCode);
          assert(scope.isDone());
          done();
        }, 50);
      });
    });

    describe("a non-200 response from Wrenchmode", function() {
      beforeEach(function() {
        scope = nock(WRENCHMODE_STATUS_HOST)
        .persist()
        .post(WRENCHMODE_STATUS_PATH)
        .replyWithError("barf");
      });

      it("should allow the request to go through", function(done) {
        let options = {
          jwt: "foo",
          checkDelaySecs: 0.001
        };

        let middleware = wrenchmodeExpress(options);

        // It will timeout and then call the next middleware in the chain
        setTimeout(function() {
          middleware(request, response, function() {
            done();
          });
        }, 30);
      });
    });

    describe("garbage JSON returned from the Wrenchmode server", function() {
      beforeEach(function() {
        scope = nock(WRENCHMODE_STATUS_HOST)
        .persist()
        .post(WRENCHMODE_STATUS_PATH)
        .reply(200, "This ain't JSON...")
      });

      it("should allow the request to go through", function(done) {
        let options = {
          jwt: "foo",
          checkDelaySecs: 0.001
        };

        let middleware = wrenchmodeExpress(options);

        // It will timeout and then call the next middleware in the chain
        setTimeout(function() {
          middleware(request, response, function() {
            done();
          });
        }, 30);
      });
    });
  });
});
