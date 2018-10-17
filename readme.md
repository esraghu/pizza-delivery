# Pizza Delivery App
An app to provide API service for ordering pizzas online

** Completed as part of the Assignment#2 from NodeJS masterclass **
---
Following API services are available

`users/register` - for registering users with their email id

`users/login` - for users to login and create a session with a new token

`users/logout` - for users to logout and delete the session token

`users/delete` - for users to delete their accounts

`users/update` - for users to update their profile/password

`orders/addToCart` - for adding items to the cart

`orders/removeItem` - for removing an item from the cart that was added earlier

`orders/getCart` - get details of the items added and the total price

`orders/deleteCart` - allowing users to abandon their cart

`orders/payment` - interface with Stripe to make a payment and also to send out an email of the invoice through mailgun