// ********************************************* APP START

var express = require('express');
var app = express();

var server = require('http').Server(app);
var port = process.env.PORT || '3000';
app.set('port', port);
server.listen(port, function(){
  console.log('listening on: ' + this.address().port);
});


// ********************************************* API START

// ********************************************* AWS START

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var dynamodb = new AWS.DynamoDB();

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: require('./config/email.json')
});

var shortid = require('shortid');

require('./users')(app, dynamodb, shortid, transporter);


// *********************************** FUNCTIONS START

function dbPut(params) {
  dynamodb.putItem(params, function(err, data) {
    if (err) { console.log(err, err.stack); }
  });
}

function dbGet(params) {
  dynamodb.query(params, function(err, data) {
    if (err) { console.log(err, err.stack); }
  });
}

var errors = [
'user exists',
'could not save',
'something went wrong'
];

var errorNums = [
0, 1, 2, 3, 4
];

// ********************************************* MOBILE START

function mobilePush(to, data) {
  request({
    method: 'POST',
    uri : 'https://gcm-http.googleapis.com/gcm/send',
    headers: {
      'Content-Type': 'application/json',
      'Authorization':'key=AIzaSyCIN38amip8bXJYMP7iIc_DKafYuIDw6Wg'
    },
    body : JSON.stringify({
      "to" : to,
      "data" : data
    })
  }, function(error, response, body){
    console.log(body);
  })
}

// to use any device on wifi --> http://10.0.0.7:3000...

module.exports = app;

// ********************************************* APP END
