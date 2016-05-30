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
      let middleware = wrenchmodeExpress({})(request, response, function() {
        done();
      });
    });
  });
});
