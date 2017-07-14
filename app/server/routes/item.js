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
 * middleware for checking request token
 */

//middleware to check token of api calls made to path /item
router.use('/', function(req, res, next) {
    if (req.cookies['sessionid'] && req.cookies['uid']) {
        var params = {
            'reqHeaders': {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + req.cookies["sessionid"]
            },
            'reqUrl': 'http://auth.c100.hasura.me/user/account/info',
            'reqMethod': 'GET'
        };

        requestMaker(params, function(response) {
            if (response['success'] == false && response['message']['hasura_id'] != req.cookies['uid']) {
                return res.json({
                    'success': false,
                    'message': 'Authentication failed. Login Again!'
                });
            } else {
                next();
            }
        });
    } else {
        return res.status(403).json({
            success: false,
            message: 'No token provided'
        });
    }
});

/**
 * select and return all items from the database
 */

router.get('/', function(req, res) {

    //preparing send data
    var params = {
        'reqHeaders': {
            'Authorization': ' Bearer ' + req.cookies["sessionid"],
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://data.c100.hasura.me/v1/query',
        'reqMethod': 'POST',
        'reqJson': {
            "type": "select",
            "args": {
                "table": "item_list",
                "columns": ["*"],
                "where": {
                    "user_id": req.cookies["uid"]
                },
                "order_by": "-expiry"
            }
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response['success']) {
            return res.json({
                'success': true,
                'message': response['message']
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
 * insert new items in the database
 */

router.post('/add', function(req, res) {

    //preparing send data
    var params = {
        'reqHeaders': {
            'Authorization': ' Bearer ' + req.cookies["sessionid"],
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://data.c100.hasura.me/v1/query',
        'reqMethod': 'POST',
        'reqJson': {
            "type": "insert",
            "args": {
                "table": "item",
                "objects": [{
                    "name": req.body.name,
                    "expiry": req.body.expiry_date,
                    "user_id": req.cookies['uid'],
                    "category_id": req.body.category
                }]
            }
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response['success']) {
            return res.json({
                'success': true,
                'message': response['message']
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
 * delete an item from the database
 */

router.post('/delete', function(req, res) {

    //preparing send data
    var params = {
        'reqHeaders': {
            'Authorization': ' Bearer ' + req.cookies["sessionid"],
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://data.c100.hasura.me/v1/query',
        'reqMethod': 'POST',
        'reqJson': {
            "type": "delete",
            "args": {
                "table": "item",
                "where": {
                    "user_id": req.cookies["uid"],
                    "id": req.body.item_id
                }
            }
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response['success']) {
            return res.json({
                'success': true,
                'message': response['message']
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
 * select and return all categories from the database
 */

router.get('/category', function(req, res) {

    //preparing send data
    var params = {
        'reqHeaders': {
            'Authorization': ' Bearer ' + req.cookies["sessionid"],
            'Content-Type': 'application/json'
        },
        'reqUrl': 'http://data.c100.hasura.me/v1/query',
        'reqMethod': 'POST',
        'reqJson': {
            "type": "select",
            "args": {
                "table": "category",
                "columns": ["*"]
            }
        }
    };

    //post request to hasura auth api
    requestMaker(params, function(response) {
        if (response['success']) {
            return res.json({
                'success': true,
                'message': response['message']
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