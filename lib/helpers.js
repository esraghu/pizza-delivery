/**
 * helper functions
 */

const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');


const helpers = {
    // check if the input email id is a valid one or not. the regex is taken from stackoverflow
    validateEmail : (email) => {
        let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    // generate a SHA256 hash value that we can store as a hashed password
    hash : str => {
        if(typeof(str) == 'string' && str.length > 0) {
            let hashStr = crypto.createHmac('sha256', 'MySecretKeyForTesting').update(str).digest('hex');
            return hashStr;
        } else {
            return false;
        }
    },

    // create a random string that can be used as token
    createRandomString : strLen => {
        strLen = typeof(strLen) == 'number' && strLen > 0 ? strLen : 20;
        let possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        while(randomString.length < strLen) {
            randomString += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
        }
        return randomString;
    },

    // parse a json buffer into an object
    parseJsonToObject : data => {
        try {
            return JSON.parse(data);
        } catch (err) {
            return {};
        }
    },

    // stripe payment api call
    stripePayment : (amount, callback) => {
        // check if the amount value is correct
        if(!amount && typeof(amount) != 'number') return callback(true);

        let payload = {
            'amount'    : parseInt(amount.toFixed(2) * 100),
            'currency'  : 'USD',
            'source'    : 'tok_amex'
        }

        let stringPayload = querystring.stringify(payload);

        let req = {
            'protocol'  : 'https:',
            'method'    : 'POST',
            'hostname'  : 'api.stripe.com',
            'path'      : '/v1/charges',
            'auth'      : process.env.stripeKey,
            'headers'   : {
                'Content-type' : 'application/x-www-form-urlencoded',
                'Content-length' : Buffer.byteLength(stringPayload)
            }
        }

        console.log(`process.env.stripeKey is ${process.env.stripeKey}`)

        let request = https.request(req, res => {
            if(res.statusCode == 200 || res.statusCode == 201) {
                console.log(`Payment successful with status code ${res.statusCode}`);
                callback(false); // payment successful
            } else {
                console.log(`Payment got declined with status code ${res.statusCode}`);
                callback(`Payment got declined with status code ${res.statusCode}`);
            }
        })

        // Bind to the error event so it doesn't get thrown
        request.on('error',(err) => {
            callback(err);
        });
  
        // Add the payload
        request.write(stringPayload);
  
        // End the request
        request.end();
    },

    // mailgun emailer
    mailgun : (email, data, callback) => {
        if(!email || !data) return callback('Either email id or data is not present in the request');

        let payload = {
            from    : 'Pizza Delivery <postmaster@sandbox5b1584fbd2214244886445ed229a04d6.mailgun.org>',
            to      : email,
            subject : 'Pizza Delivery Invoice',
            text    : JSON.stringify(data)
        };

        let stringPayload = querystring.stringify(payload);

        let req = {
            'protocol'  : 'https:',
            'method'    : 'POST',
            'hostname'  : 'api.mailgun.net',
            'path'      : '/v3/sandbox5b1584fbd2214244886445ed229a04d6.mailgun.org/messages',
            'auth'      : `api:${process.env.mailgunSecret}`,
            'headers'   : {
                'Content-type' : 'application/x-www-form-urlencoded',
                'Content-length' : Buffer.byteLength(stringPayload)
            }
        }

        let request = https.request(req, res => {
            if(res.statusCode == 200) {
                console.log(`Email sent successfully with status code ${res.statusCode}`);
                callback(false);
            } else {
                callback(`Email could not be sent and declined with status code ${res.statusCode}`);
            }
        })

        // Bind to the error event so it doesn't get thrown
        request.on('error',(err) => {
            callback(err);
        });
  
        // Add the payload
        request.write(stringPayload);
  
        // End the request
        request.end();

    }
}

module.exports = helpers;