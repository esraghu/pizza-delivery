/**
 * This program will run the api server related tasks
 * 
 */

// dependencies
const http = require('http');
const https = require('https');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const fs = require('fs');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const debug = util.debuglog('server');

let httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

// instantiate the server module object
const server = {
    
    // logic for running the unified server for both http and https
    unifiedServer : (req, res) => {
        // parse the url
        let parsedUrl = url.parse(req.url, true);

        // get the path
        let path = parsedUrl.pathname;
        let trimmedPath = path.replace(/^\/+|\/+$/g, '');

        // get the query string as an object
        let queryStringObject = parsedUrl.query;

        // get the http method
        let method = req.method.toLowerCase();

        // get headers as an object
        let headers = req.headers;

        // get the payload, if any
        let decoder = new stringDecoder('utf-8');
        let buffer = '';
        req.on('data', (data) => {
            buffer += decoder.write(data);
        });
        req.on('end', () => {
            buffer += decoder.end();

            // check the router for a matching path for a handler
            let chosenHandler = typeof(server.router[trimmedPath.substring(0, trimmedPath.indexOf('/'))]) !== 'undefined' ? server.router[trimmedPath.substring(0, trimmedPath.indexOf('/'))] : handlers.notFound;
            
            // construct the data object to send to the handler
            let data = {
                'path' : trimmedPath,
                'queryStringObject' : queryStringObject,
                'method' : method,
                'headers' : headers,
                'payload' : helpers.parseJsonToObject(buffer)
            };

            // route the request to the handler specified in the routing table
            chosenHandler(data, (statusCode, payload) => {
                if (typeof(statusCode) !== 'number') {
                    statusCode = 200; // default value
                };

                if(typeof(payload) !== 'object') {
                    payload = {};
                };

                let payloadString = JSON.stringify(payload);

                // return the response
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(statusCode);
                res.end(payloadString);

                if(statusCode == 200) {
                    // print in green
                    debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
                } else {
                    // print in red
                    debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
                }
            })
        })
    },

    // define request routers
    router : {
        'ping': handlers.ping,
        'users': handlers.users,
        'orders': handlers.orders,
        'checks': handlers.checks,
    },

    // instantiate the http server
    httpServer : http.createServer((req, res) => {
        server.unifiedServer(req, res);
    }),

    // instantiate the https server
    httpsServer : https.createServer(httpsServerOptions, (req, res) => {
        server.unifiedServer(req, res);
    }),

};

// export the server module
module.exports = server;
