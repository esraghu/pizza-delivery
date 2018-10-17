/**
 *  request handlers
 * 
 */

const helpers = require('./helpers');
const _data = require('./data');

const _users = {
    /**
     * path : users/register
     * register new users into the system
     * @param - data.payload - firstName, lastName, email id, street address, password
     * @callback - status code, message object
     */
    register : (data, callback) => {
        // check if all necessary fields are available
        let firstName = data.payload.firstName; 
        if(typeof(firstName) != 'string' || firstName.trim().length < 1) {
            return callback(400, {'Error': 'Missing firstname'});
        };

        let lastName = data.payload.lastName;
        if(typeof(lastName) != 'string' || lastName.trim().length < 1) {
            return callback(400, {'Error': 'Missing lastname'});
        };

        let email = data.payload.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) {
            return callback(400, {'Error': 'Invalid email id'});
        };

        let streetAddress = data.payload.streetAddress;
        if(typeof(streetAddress) != 'string' || streetAddress.trim().length < 1) {
            return callback(400, {'Error' : 'Missing street address'});
        };

        let password = data.payload.password;
        if(typeof(password) != 'string' || password.trim().length < 1) {
            return callback(400, {'Error' : 'Missing password'});
        };

        // let's check if the user doesn't exist yet
        _data.read('users', email, (err, data) => {
            if(!err && data) {
                return callback(400, {'Error' : 'User with this email id already exists in our database'});
            }

            // now that we have all the necessary fields and the user does not exist, let's add the user to the database
            let userObject = {
                'firstName' : firstName.trim(),
                'lastName' : lastName.trim(),
                'email' : email.trim(),
                'streetAddress' : streetAddress.trim(),
                'hashedPassword' : helpers.hash(password.trim())
            }

            _data.create('users', email, userObject, (err) => {
                if(err) {
                    callback(500, {'Error' : 'Could not create the user due to an internal error. Try again later'});
                } else {
                    callback(200, {'Success': 'Welcome to Pizza Delivery, you are account has been created'});
                }
            })
        });

    },

    /**
     * path : user/login
     * user login - verify password and generate a new token
     * @param - data.querystring - email, password
     * @callback - status code, {token, menulist}
     */
    login : (data, callback) => {
        // verify that the email is valid
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email))) {
            callback(400, {'Error': 'Invalid email id'});
            return;
        };

        // now check if the user exists in store
        _data.read('users', email, (err, userData) => {
            if(err && !userData) return callback(400, {'Error': 'User-id or password invalid'});

            // if the user exists, then let's check for his password
            if(helpers.hash(data.queryStringObject.password) != userData.hashedPassword) return callback(400, {'Error': 'User-id or password invalid'});

            // email-id and password are correct. we now need to create a token and return it to be used for the session
            let tokenObj = {
                'token' : helpers.createRandomString(20),
                'expires' : Date.now() + 1000 * 60 * 60 
            }
            _data.create('tokens', email, tokenObj, (err) => {
                if(err) {
                    callback(500, {'Error' : 'Could not generate a token for this session'});
                } else {
                    callback(200, {'token' : tokenObj.token, 'menu' : _orders.getMenu});
                }
            })
        })        
    },
    
    /**
     * path : users/update
     * update user profile/password
     * @param - data.querystring - email, token, 
     * optional paramas - data.payload - firstName, lastName, address, password
     * @callback - status code, {error message}
     */
    update : (data, callback) => {
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check what fields are to be updated
        let firstname = (data.payload.firstName && typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0)? data.payload.firstName.trim() : false;
        let lastname = (data.payload.lastName && typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0)? data.payload.lastName.trim() : false;
        let streetAddress = (data.payload.streetAddress && typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0)? data.payload.streetAddress.trim() : false;
        let password = (data.payload.password && typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0)? data.payload.password.trim() : false;

        if(!firstname && !lastname && !streetAddress && !password) return callback(400, {'Error': 'No fields passed for updation'});

        // check if the user exists and the token is valid
        _data.read('users', email, (err, userData) => {
            if(err && !userData) return callback(400, {'Error': 'User-id or password invalid'});

            // if the user exists, then let's check if a valid token has been received
            _data.read('tokens', email, (err, tokenObj) => {
                // in case token not found, request to login again
                if(err && !tokenObj) return callback(400, {'Error': 'Seems to be an invalid session. Try logging in again'});

                // if invalid token found, return unauthorised
                if(data.queryStringObject.token != tokenObj.token) return callback(401, {'Error': 'Unauthorised attempt to update data!'});

                // if session has expired, ask for re-login
                if(Date.now() > tokenObj.expires) return callback(403, {'Error': 'Session has expired, login agian'});

                // now that we have verified, the session is still active, let's attempt updating the data
                if(firstname) userData.firstName = firstname;
                if(lastname) userData.lastName = lastname;
                if(streetAddress) userData.streetAddress = streetAddress;
                if(password) userData.hashedPassword = helpers.hash(password);

                _data.update('users', email, userData, (err) => {
                    if(err) {
                        return callback(500, {'Error': 'Could not update the record'});
                    } else {
                        return callback(200, {'Success': 'Record has been updated'});
                    }
                })
            });

        })        
    },

    /**
     * path : users/logout
     * user logout - delete the token
     * @param - data.querystring - email
     * @callback - status code, {error message}
     */
    logout : (data, callback) => {
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // delete the token file
        _data.delete('tokens', email, (err) => {
            // irrespective of the error, just send out a message that you have been logged out
            callback(200, {'Success': 'You have been logged out'});
        })
    },

    /**
     * path : users/delete
     * delete user - delete the user record and tokens
     * @param - data.querystring - email, token
     * @callback - status code, {error message}
     */
    delete : (data, callback) => {
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});
        
        _data.read('tokens', email, (err, tokenObj) => {
            // in case token not found, request to login again
            if(err && !tokenObj) return callback(400, {'Error': 'Seems to be an invalid session. Try logging in again'});

            // if invalid token found, return unauthorised
            if(data.queryStringObject.token != tokenObj.token) return callback(401, {'Error': 'Unauthorised attempt!'});

            // if session has expired, ask for re-login
            if(Date.now() > tokenObj.expires) return callback(403, {'Error': 'Session has expired, login agian'});

            // first delete the tokens file
            _data.delete('tokens', email, (err) => {
                if(err) return callback(500, {'Error': 'Could not delete the record'});
                // try deleting any open orders
                _data.delete('orders', email, (err) => {
                    if(err) console.log(err);
                })
                // now delete the user record
                _data.delete('users', email, (err) => {
                    err? callback(500, {'Error': 'Could not delete the record'}): callback(200, {'Success': 'You have been successfully de-registered'});
                })
            })
        })
    },
}

const _orders = {
    getMenu : {
        'Veg Pizza' : {'Name' : 'Veg Pizza', 'Price': 100, 'Desc': 'Pizza topped with seasonal vegetables'},
        'Veggie Delight' : {'Name' : 'Veggie Delight', 'Price': 150, 'Desc': 'Pizza topped with the most exotic veggies'},
        'Tandoori Paneer' : {'Name' : 'Tandoori Paneer', 'Price': 200, 'Desc': 'Pizza topped with tandoori fried Paneer'}
    },

    /**
     * path : orders/addToCart
     * add items to the shopping cart
     * @param - data.queryString - email, token; data.payload - item (menu item)
     * @callback - status code, error message
     */
    addToCart : (data, callback) => {
        // check if the request has come from a registered user
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check if the users session is still active
        let token = data.queryStringObject.token;
        _data.read('tokens', email, (err, tokenObj) => {
            if(err || !tokenObj || token != tokenObj.token || Date.now() > tokenObj.expires) return callback(403, {'Error': 'Please login before placing an order'});
            
            // let's check if the user's request is on the menu
            if (!_orders.getMenu[data.payload.item]) return callback(400, {'Error': 'Sorry, we do not have this on our menu today!'});
            let orderedItem = _orders.getMenu[data.payload.item];

            // check if there is a shopping cart created earlier, then just add to it
            _data.read('orders', email, (err, orderObj) => {
                if(err) {
                    // we need to create a token file, but first set the object prior to saving it
                    orderObj = {
                        'orderedItems' : {},
                        'totalPrice' : orderedItem.Price
                    }
                    orderObj.orderedItems[orderedItem.Name] = 1;
                    _data.create('orders', email, orderObj, (err) => {
                        if(err) {
                            callback(500, {'Error': 'Could not add item to cart'});
                        } else {
                            callback(200, {'Success': 'Item added to cart successfully'});
                        }
                    })
                } else {
                    // we have append to the existing order, increase the quantity if the item is already on the list
                    if(orderObj.orderedItems[orderedItem.Name] > 0) {
                        orderObj.orderedItems[orderedItem.Name]++;
                    } else {
                        orderObj.orderedItems[orderedItem.Name] = 1;
                    }
                    orderObj.totalPrice += orderedItem.Price;

                    _data.update('orders', email, orderObj, (err) => {
                        if(err) {
                            callback(500, {'Error': 'Could not update the cart'});
                        } else {
                            callback(200, {'Success': 'Item updated in the cart'});
                        }
                    })
                }
            })
        })
    },

    /**
     * path : orders/getCart
     * get items added to the shopping cart so far
     * @param - data.queryString - email, token;
     * @callback - status code, error message or shopping cart object
     */
    getCart : (data, callback) => {
        // check if the request has come from a registered user
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check if the users session is still active
        let token = data.queryStringObject.token;
        _data.read('tokens', email, (err, tokenObj) => {
            if(err || !tokenObj || token != tokenObj.token || Date.now() > tokenObj.expires) return callback(403, {'Error': 'Please login before placing an order'});
            
            // check if there is a shopping cart created earlier, then just add to it
            _data.read('orders', email, (err, orderObj) => {
                if(err) {
                    callback(404, {'Error': 'Shopping cart does not exist'})
                } else {
                    callback(200, orderObj)
                }
            })
        })
    },

    /**
     * path : orders/removeItem
     * remove items from the shopping cart
     * @param - data.queryString - email, token; data.payload - item (menu item)
     * @callback - status code, error message
     */
    removeItem : (data, callback) => {
        // check if the request has come from a registered user
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check if the users session is still active
        let token = data.queryStringObject.token;
        _data.read('tokens', email, (err, tokenObj) => {
            if(err || !tokenObj || token != tokenObj.token || Date.now() > tokenObj.expires) return callback(403, {'Error': 'Please login before placing an order'});
            
            // let's check if the user's request is on the menu
            if (!_orders.getMenu[data.payload.item]) return callback(400, {'Error': 'Sorry, we do not have this on our menu today!'});
            let orderedItem = _orders.getMenu[data.payload.item];

            // check if there is a shopping cart created earlier, then just add to it
            _data.read('orders', email, (err, orderObj) => {
                if(err) {
                    // we don't have a shopping cart for this user created so far
                    return callback('404', {'Error': 'Shopping cart not found'});
                } else {
                    if(!orderObj.orderedItems[orderedItem.Name]) return callback(404, {'Error': 'This item has not been found in your cart'});
                    if(orderObj.orderedItems[orderedItem.Name] > 1) {
                        orderObj.orderedItems[orderedItem.Name]--;
                    } else {
                        delete orderObj.orderedItems[orderedItem.Name];
                    }
                    orderObj.totalPrice -= orderedItem.Price;
                    // now write back the updated object
                    _data.update('orders', email, orderObj, (err) => {
                        if(err) {
                            callback(500, {'Error': 'Sorry, could not drop this from the shopping cart'});
                        } else {
                            callback(200, {'Success' : 'Item removed from your cart'});
                        }
                    })
                }
            })
        })
    },
    
    /**
     * path : orders/deleteCart
     * delete the shopping cart
     * @param - data.queryString - email, token
     * @callback - status code, error message
     */
    deleteCart : (data, callback) => {
        // check if the request has come from a registered user
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check if the users session is still active
        let token = data.queryStringObject.token;
        _data.read('tokens', email, (err, tokenObj) => {
            if(err || !tokenObj || token != tokenObj.token || Date.now() > tokenObj.expires) return callback(403, {'Error': 'Please login before placing an order'});
            
            _data.delete('orders', email, (err) => {
                if(err) {
                    callback(500, {'Error': 'Shopping cart could not be emptied at the moment'})
                } else {
                    callback(200, {'Success': 'All items have been dropped from your shopping cart'})
                }
            })
        })

    },

    /**
     * path : orders/payment
     * user checkout
     * @param - data.queryString - email, token
     * @callback - status code, error message
     */
    payment : (data, callback) => {
        // check if the request has come from a registered user
        let email = data.queryStringObject.email;
        if(typeof(email) != 'string' || !(helpers.validateEmail(email.trim()))) return callback(400, {'Error': 'Invalid email id'});

        // check if the users session is still active
        let token = data.queryStringObject.token;
        _data.read('tokens', email, (err, tokenObj) => {
            if(err || !tokenObj || token != tokenObj.token || Date.now() > tokenObj.expires) return callback(403, {'Error': 'Please login before placing an order'});
            
            _data.read('orders', email, (err, orderObj) => {
                if(err) return callback(404, {'Error': 'Could not find anything in the shopping cart'})
                helpers.stripePayment(orderObj.totalPrice, (err) => {
                    if (err) return callback(400, {'Error': 'Payment could not be completed, please try again or with a different card'});

                    // so the payment is successful, let's initiate an email receipt to the customer
                    helpers.mailgun(email, orderObj, (err) => {
                        if(err) console.log(`${err}`);
                    })
                    callback(200, {'Success': 'Your payment is successful and the order has been placed. You will receive an email receipt'});
                })
            })
        })
    }
}

const handlers = {
    ping : (data, callback) => {
        setTimeout(() => callback(200), 5000);
    },

    notFound : (data, callback) => { 
        callback(404); 
    },

    users : (data, callback) => {
        ['register', 'login', 'update', 'logout', 'delete'].includes(data.path.substring(data.path.indexOf('/')+1))? _users[data.path.substring(data.path.indexOf('/')+1)](data, callback) : callback(405);
    },

    orders : (data, callback) => {
        ['addToCart', 'getCart', 'removeItem', 'deleteCart', 'payment'].includes(data.path.substring(data.path.indexOf('/')+1))? _orders[data.path.substring(data.path.indexOf('/')+1)](data, callback) : callback(405);
    }

}

module.exports = handlers;
