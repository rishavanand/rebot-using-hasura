var request = require('request');
var nodemailer = require('nodemailer');

//Credentials from environment variable

var adminPassword = process.env.hasura_admin_password; //Hasura console's admin passowrd

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.gmail_username, //Gmail username
        pass: process.env.gmail_password //Gmail password
    }
});


/**
 * requestMaker() function helps make requests using the request package
 * @param {object} [params] data required fo the request
 * @return {object} [res] response from the host
 */

function requestMaker(params, res) {

    //preparing send data
    var reqData = {
        url: params['reqUrl'],
        method: params['reqMethod'],
        headers: params['reqHeaders'],
        json: params['reqJson']
    };

    request(reqData, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            return res({
                'success': true,
                'message': response['body']
            });
        } else {
            return res({
                'success': false,
                'message': response['body']
            });
        }
    });
}

/**
 * sendReminderEmail() function sends reminder emails
 * @param {object} [data] parameters required for sending an email
 * @return {object} [res] success of operation
 */

function sendReminderEmail(data, callback) {

    var mailOptions = {
        from: 'ReBot <rebot.remind.me@gmail.com>',
        to: data['toName'] + '<' + data['toEmail'] + '>',
        subject: 'Expiry reminder',
        text: 'Your ' + data['itemName'] + ' is going to expire on ' + data['itemExpiry'] + '. Renew is soon.'
    };

    transporter.sendMail(mailOptions, function(error, info) {

        if (error) {
            return callback({
                'success': false,
                'message': error
            });
        } else {
            return callback({
                'success': true,
                'message': info.response
            });
        }

    });
}

/**
 * reminderUpdate() function updates reminder column of the item database
 * @param {object} [data] parameters for hasura api call
 * @return {object} [res] success of operation
 */

function reminderUpdate(data, callback) {

    var params = {
        'reqHeaders': {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + data['token']
        },
        'reqUrl': 'http://data.c100.hasura.me/v1/query',
        'reqMethod': 'POST',
        'reqJson': {
            "type": "update",
            "args": {
                "table": "item",
                "$set": {
                    "reminder": data['updateTo']
                },
                "where": {
                    "id": data['id']
                }
            }
        }
    };

    requestMaker(params, function(reminderRes) {
        if (reminderRes['success'] == false) {
            return callback({
                'success': false,
                'message': JSON.stringify(reminderRes['message'])
            });
        } else {
            return callback({
                'success': true
            });
        }
    });
}

//function to get todays date
function dateToday() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}

module.exports = {

    mail: function() {

        setInterval(function() {

        	console.log('checking for expiries...');

            //request data
            var params = {
                "reqHeaders": {
                    "Content-Type": "application/json"
                },
                "reqUrl": 'http://auth.c100.hasura.me/login',
                "reqMethod": 'POST',
                "reqJson": {
                    "username": 'admin',
                    "password": adminPassword
                }
            };

            //make request and extract admin token
            requestMaker(params, function(loginRes) {
                if (!loginRes['success']) {

                    console.log('Login as admin failed during routine expiry check due to ' + loginRes["message"]["message"]);

                } else {

                    //store admin token
                    var adminToken = loginRes["message"]["auth_token"];

                    //request data
                    var params = {
                        'reqHeaders': {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + adminToken
                        },
                        'reqUrl': 'http://data.c100.hasura.me/v1/query',
                        'reqMethod': 'POST',
                        'reqJson': {
                            "type": "select",
                            "args": {
                                "table": "exp_list",
                                "columns": ["*"]
                            }
                        }
                    };

                    //make request and list all items with expiry date using admin token
                    requestMaker(params, function(selectRes) {

                        if (!selectRes["success"]) {

                            console.log('Rows could not be fetched from exp_list due to : ' + selectRes["message"]["message"]);

                        } else {

                            var i;

                            //loop for each item
                            function arrayLoop(i) {
                                if (i < selectRes["message"].length) {

                                    //calculate days left to expiry
                                    var todayDate = dateToday();
                                    todayDate = todayDate.split('-');
                                    todayDate = new Date(todayDate[0], todayDate[1] - 1, todayDate[2]);

                                    var expiryDate = selectRes["message"][i]['expiry'];
                                    expiryDate = expiryDate.split('-');
                                    expiryDate = new Date(expiryDate[0], expiryDate[1] - 1, expiryDate[2]);

                                    var daysLeft = Math.round((expiryDate - todayDate) / (1000 * 60 * 60 * 24));

                                    console.log('days left: ' + daysLeft);

                                    var updateTo = '';

                                    //if 1 or 2 days left send first reminder and set 'reminder' value to sent
                                    //else if 0 left send last reminder and set 'reminder' value to expired

                                    if ((daysLeft == 1 || daysLeft == 2) && (selectRes["message"][i]['reminder'] != 'sent')) {

                                        updateTo = 'sent';


                                    } else if (daysLeft <= 0 && selectRes["message"][i]['reminder'] != 'expired') {

                                        updateTo = 'expired';

                                    }

                                    if (updateTo) {

                                        //request data
                                        var sendData = {
                                            'toName': selectRes["message"][i]['username'],
                                            'toEmail': selectRes["message"][i]['email'],
                                            'itemName': selectRes["message"][i]['name'],
                                            'itemExpiry': selectRes["message"][i]['expiry']
                                        };

                                        //send email
                                        sendReminderEmail(sendData, function(res) {

                                            //if email was sent successfully
                                            if (res['success']) {

                                                sendData = {
                                                    'token': adminToken,
                                                    'updateTo': updateTo,
                                                    'id': selectRes["message"][i]['id']
                                                };

                                                //update reminder column of the item
                                                reminderUpdate(sendData, function(res) {

                                                    if (!res['success']) {

                                                        console.log('Email reminder sent but reminder column coud not be updated due to : ' + res.message);

                                                    }
                                                });

                                            } else {

                                                console.log('Email could not be sent due to : ' + res['message']);

                                            }
                                        });

                                    }

                                    arrayLoop(i + 1);

                                }
                            }

                            arrayLoop(0);

                        }
                    });
                }
            });
        }, 60000);
    }
}