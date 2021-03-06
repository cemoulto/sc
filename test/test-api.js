var camp = require('../lib/camp');
var fleau = require('fleau');
var http = require('http');
var stream = require('stream');
var Test = require('./test');
var t = new Test();

var launchTests = function() {
  t.seq([
    function t0(next) {
      http.get('http://localhost:' + portNumber, function(res) {
        t.eq(res.httpVersion, '1.1', "Server must be HTTP 1.1.");
        t.eq(res.headers['transfer-encoding'], 'chunked',
          "Connection should be chunked by default.");
        res.on('data', function(content) {
          t.eq('' + content, '404',
               "Did not receive content of index.html.");
          next();
        });
      });
    },

    function t1(next) {
      // Using a streamed route.
      // Create a stream out of the following string.
      var template = '{{= text in plain}}\n{{for comment in comments{{\n- {{= comment in plain}}}} }}';

      server.route( /^\/blog$/, function(query, match, end) {
        end ({
          text: 'My, what a silly blog.',
          comments: ['first comment!', 'second comment…']
        }, {
          string: template,   // A stream.
          reader: fleau
        });
      });

      // Test that now.
      http.get('http://localhost:' + portNumber + '/blog', function(res) {
        var content = '';
        res.on('data', function(chunk) {
          content += '' + chunk;
        });
        res.on('end', function() {
          t.eq(content, 'My, what a silly blog.\n\n- first comment!\n- second comment…',
            "Routing a streamed template should work.");
          next();
        });
      });
    }
  ], function end() {
    t.tldr();
    process.exit(0);
  });
};

// FIXME: is there a good way to make a server get a port for testing?
var server;
var portNumber = 8000;
var startServer = function() {
  server = camp.start({port:portNumber, documentRoot:'./test/web'});
  server.on('listening', launchTests);
};
var serverStartDomain = require('domain').create();
serverStartDomain.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    portNumber++;
    serverStartDomain.run(startServer);
  } else {
    throw err;
  }
});
serverStartDomain.run(startServer);

