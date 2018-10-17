/**
 * Primary file for the api
 * 
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const server = require('./lib/server');

// Declare the app
const app = {
    init : () => {
        // let's first load env variables from the .env file, which is in a JSON format
        envFilePath = path.resolve(process.cwd(), '.env');
        let content = JSON.parse(fs.readFileSync(envFilePath, 'utf-8'));
        Object.keys(content).forEach((key) => {
            if(process.env.hasOwnProperty(key)) {
                console.log(`${key} already present in the environment and will not be overwritten`)
            } else {
                process.env[key] = content[key];
                console.log(`${key}=${process.env[key]} has been loaded`)
            }
        })

        // initialize the http server
        server.httpServer.listen(process.env.httpPort, () => {
            console.log('\x1b[36m%s\x1b[0m',`The HTTP server is running on port ${process.env.httpPort}`);
        });

        // start the https server
        server.httpsServer.listen(process.env.httpsPort, () => {
            console.log('\x1b[35m%s\x1b[0m',`The HTTPS server is running on port ${process.env.httpsPort}`);
        });
    }
};

// initiate the app now
app.init();

// export the app
module.exports = app;