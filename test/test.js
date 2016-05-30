"use strict";

var assert = require('chai').assert;
var httpMocks = require('node-mocks-http');

var wrenchmodeExpress = require('../index');

var request, response = {};

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
    });

    it("should redirect to Wrenchmode", function(done) {
      let options = {
        checkDelaySecs: 0.001
      };

      let middleware = wrenchmodeExpress(options);

      // Give it a little time to get a response from our fake Wrenchmode server
      setTimeout(function() {
        middleware(request, response, function() {})
        assert.equal(302, response.statusCode);
        done();
      }, 10);
    });
  });
});
