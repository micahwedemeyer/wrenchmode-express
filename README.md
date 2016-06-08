# Wrenchmode Express

This is an [Express Middleware](http://expressjs.com/) for managing maintenance mode on your Express web application using [Wrenchmode](http://wrenchmode.com).

## Installation

```javascript
npm install --save wrenchmode-express
```

## Usage

```javascript
# app.js
var express = require('express');
var app = express();
var wrenchmodeExpress = require('wrenchmode-express');

app.use(wrenchmodeExpress({
  jwt: "your-really-long-jwt"
}));


# If you want to test in staging prior to deploying to production.
# (Coming soon, still not implemented...)
app.use(wrenchmodeExpress({
  jwt: "your-really-long-jwt",
  ignoreTestMode: false
}));
```

## Advanced Configuration Options

You can also specify the following options to the middleware layer:

`forceOpen` - Set to true to force the middlware layer to allow all requests through, regardless of project status on Wrenchmode.com. Effectively disables the middleware. (Default false)

`ignoreTestMode` - (Coming soon...) Set to false to if you want the middleware to respond to a project that is in Test mode on Wrenchmode.com This can be useful if you want to test Wrenchmode in a development or staging environment prior to deploying to production. (Default true)

`disableLocalWrench` - (Coming soon...) Set to true if you want to disable LocalWrench mode, where the Wrenchmode page is served on your domain. Disabling it will instead force a redirect to the Wrenchmode.com domain. Note: Unless you explicitly want this behavior, it's best to leave this at the default. (Default false)

`checkDelaySecs` - Change this to modify the rate at which the middleware polls Wrenchmode for updates. Unlikely that this needs anything faster than the default. (Default 5)

## FAQ

### Does every request to my server get proxied through Wrenchmode? Isn't that slow?

No. The middleware does not function as a proxy at all in that fashion. Instead, the middleware periodically checks the Wrenchmode API for changes and updates its own internal state. In other words, the middleware adds zero performance impact on requests to your server.

### What if the Wrenchmode service is down? Will my project be brought down as well?

No. The middleware is designed to fail open, meaning that if it encounters any errors or cannot contact the Wrenchmode API, it will automatically revert to "open" mode where it allows all requests to pass through normally to your server.

## License

The gem is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

