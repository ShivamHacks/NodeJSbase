// ********************************************* APP START

var express = require('express');
var path = require('path');
var app = express();

var server = require('http').Server(app);
var port = process.env.PORT || '3000';
app.set('port', port);
server.listen(port, function(){
  console.log('listening on: ' + this.address().port);
});

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var dynamodb = new AWS.DynamoDB();

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: require('./config/email.json')
});

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.static(path.join(__dirname, 'public')));

var fs = require('fs');
var s3 = new AWS.S3();

app.post('/add', multipartMiddleware, function (req, res) {
  var imagePath = req.files.image.path;
  var imageName = req.body.name;
  var img = fs.readFileSync(imagePath);
  var params = {
    Bucket: 'userstest', 
    Key: imageName, 
    Body: img,
    ContentType: img.mimetype,
    ACL: 'public-read'
  };
  s3.upload(params, function(err, data) {
    console.log(err, data);
    res.send("<img src='" + data.Location + "'>");
  });
});

app.get('/newuser', function (req, res, next) {
  res.render('add', {});
});

var shortid = require('shortid');

require('./users')(app, dynamodb, s3, fs, shortid, transporter, multipartMiddleware);








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
      'Authorization':'key=' + require('./config/gcm.json')
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
