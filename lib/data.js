/**
 * all the data related functions here
 * 
 */

// add all dependencies
const path = require('path');
const fs = require('fs');
const helpers = require('./helpers');

const baseDir = path.join(__dirname, '/../.data/');

const lib = {
    // create a record in the datastore
    create : (store, file, data, callback) => {
        let openMode = '';
        if(store == 'users') {
            openMode = 'wx'
        } else if(store == 'tokens' || store == 'orders') {
            openMode = 'w'
        } else {
            return callback('Invalid data store passed');
        }

        // try to create a record in the data store
        fs.open(`${baseDir}${store}/${file}.json`, openMode, (err, fd) => {
            if(err || !fd) {    // fd means file descriptor
                return callback('Could not create the file');
            }
            // successfully opened the file, so let's write the data into it
            fs.write(fd, JSON.stringify(data), (err) => {
                if(err) {
                    callback('Could not write the data into the file');
                } else {
                    // close the file
                    fs.close(fd, closeErr => {
                        callback(closeErr)
                    });
                };
            })
        })
    },

    // read a record from the datastore
    read : (store, file, callback) => {
        // check if valid data store name is passed
        if(['users', 'tokens', 'orders'].indexOf(store) < 0) return callback('Invalid data store passed');

        // try to read the file and read data
        fs.readFile(`${baseDir}${store}/${file}.json`, 'utf-8', (err, data) => {
            if(err && !data) return callback(err);
            let parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        })
    },

    // update a record in the datastore
    update : (store, file, data, callback) => {
        // check if valid data store name is passed
        if(['users', 'tokens', 'orders'].indexOf(store) < 0) return callback('Invalid data store passed');

        // check if the file is present, we don't want to create a file here
        fs.access(`${baseDir}${store}/${file}.json`, fs.constants.W_OK, (err) => {
            if(err) return callback('File not accessible');
            fs.open(`${baseDir}${store}/${file}.json`, 'w', (err, fd) => {
                if(err) return callback('Could not open file for writing');
                fs.write(fd, JSON.stringify(data), (err) => {
                    if(err) {
                        return callback('Write failed!');
                    } else {
                        fs.close(fd, (err) => {
                            return callback(err);
                        })
                    }
                })
            })
        })
    },

    // delete a record in the datastore
    delete : (store, file, callback) => {
        if(['users', 'tokens', 'orders'].indexOf(store) < 0) return callback('Invalid data store passed');
        fs.unlink(`${baseDir}${store}/${file}.json`, (err) => {
            callback(err);
        });
    }
}

module.exports = lib;