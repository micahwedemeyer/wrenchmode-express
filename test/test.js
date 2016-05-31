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
  describe("basic operation", function() {
    beforeEach(function() {
      request = httpMocks.createRequest({
        method: 'GET',
        url: '/myapp/somepath'
      });
      response = httpMocks.createResponse();
    });

    it("should call the next middleware in the chain", function(done) {
      wrenchmodeExpress({})(request, response, function() {
        done();
      });
    });
  });

  describe("in wrenchmode", function() {
    beforeEach(function() {
      request = httpMocks.createRequest({
        method: 'GET',
        url: '/myapp/somepath'
      });
      response = httpMocks.createResponse();

      scope = nock(WRENCHMODE_STATUS_HOST)
      .persist()
      .post(WRENCHMODE_STATUS_PATH)
      .reply(200, {
        is_switched: true,
        switch_url: "https://myproject.wrenchmode.com/maintenance"
      });
    });

    it("should redirect to Wrenchmode", function(done) {
      let options = {
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
          checkDelaySecs: 0.1,
          readTimeoutSecs: 0.1
        };

        let middleware = wrenchmodeExpress(options);

        // It will timeout and then respond with a 200
        setTimeout(function() {
          middleware(request, response, function() {})
          assert.equal(200, response.statusCode);
          done();
        }, 50);
      });
    });

    describe("a non-200 response from Wrenchmode", function() {
      beforeEach(function() {
        scope = nock(WRENCHMODE_STATUS_HOST)
        .persist()
        .post(WRENCHMODE_STATUS_PATH)
        .reply(500, "barf")
      });

      it("should allow the request to go through", function(done) {
        let options = {
          checkDelaySecs: 0.001
        };

        let middleware = wrenchmodeExpress(options);

        // It will timeout and then respond with a 200
        setTimeout(function() {
          middleware(request, response, function() {})
          assert.equal(200, response.statusCode);
          done();
        }, 30);
      });
    });
  });
});
