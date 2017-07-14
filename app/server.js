'use strict';

var express = require('express');
var app = express();

//look for static files in html folder and allow access without .html extension
app.use(express.static('html', {
    extensions: ['html', 'htm'],
}));

//send index.html as homepage 
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

//route for user login/register
var auth = require('./server/routes/auth.js');
app.use('/auth', auth);

//route for item add/delete/list and list category
var item = require('./server/routes/item.js');
app.use('/item', item);

var reminder = require('./server/reminder/mail.js');
reminder.mail();

//start the server
app.listen(8081,function(){
    console.log('Server started on port 8081');
});

