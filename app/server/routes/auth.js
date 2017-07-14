var express = require('express');
var router = express.Router();
var request = require('request');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({
    extended: true
}));
router.use(cookieParser());

/**
 * requestMaker() function helps make requests using the request package
 * @param {object} [params] data to be sent in the request
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
 * user login handler
 */

router.post('/login', function(req, res) {

    var params = {
        'reqHeaders': {
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://auth.c100.hasura.me/login',
        'reqMethod': 'POST',
        'reqJson': {
            'username': req.body.username, //data from login form
            'password': req.body.password
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response["success"]) {
            return res.json({
                'success': true,
                'token': response['message']['auth_token'],
                'uid': response['message']['hasura_id']
            });
        } else {
            return res.json({
                'success': false,
                'message': response['message']['message']
            });
        }
    });
});


/**
 * user registration handler
 */

router.post('/register', function(req, res) {

    //preparing send data
    var params = {
        'reqHeaders': {
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://auth.c100.hasura.me/signup',
        'reqMethod': 'POST',
        'reqJson': {
            'username': req.body.username, // data from registration from
            'password': req.body.password,
            'email': req.body.email
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response['success']) {
            return res.json({
                'success': true,
                'token': response['message']['auth_token'],
                'uid': response['message']['hasura_id']
            });
        } else {
            return res.json({
                'success': false,
                'message': response['message']['message']
            });
        }
    });
});

//export this router to use in our server.js
module.exports = router;