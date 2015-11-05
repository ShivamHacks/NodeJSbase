module.exports = function(app, dynamodb, shortid, transporter) {

	// ********************************************* USER REQUESTS

	// sign up
	app.get('/newuser', function(req, res) {
  		// also add an array of mobile push tokens for each device
  		var uname = req.query.uname;
  		var email = req.query.email;
  		var pswrd = req.query.pswrd;
  		var token = shortid.generate();
  		userDBuserExists(userParamsUserExists({
  			uname: uname
  		}), function(exists) {
  			if (exists) {
  				res.send('error');
  			} else {
  				userDBput(userParamsPutNew({
  					uname: uname,
  					email: email,
  					pswrd: pswrd,
  					token: token
  				}), function(done) {
  					if (done) {
          				// EMAIL FOR CONFIRMATION
          				var to = email;
          				var subject = 'New User';
          				var body = require('./temps/email_confirm.json').body
          				.replace(/%uname%/g, uname)
          				.replace(/%email%/g, email)
          				.replace(/%pswrd%/g, pswrd)
          				.replace(/%token%/g, token);
          				sendEmail(to, subject, body);
          				res.send('done');
          			} else {
          				res.send('error');
          			}
          		});
  			}
  		});
  	});

	// confirm account
	app.get('/confirm', function(req, res) {
		var uname = req.query.uname;
		var email = req.query.email;
		var token = req.query.token;
		userDBFind(userParamsFindConfirm({ 
			uname: uname,
			token: token
		}), 'token', function(check) {
			if (token == check) {
				userDBupdate(userParamsUpdateConfirmation({
					uname: uname,
					email: email
				}), function(done) {
					if (done) { res.send('done'); }
					else { res.send('error'); }
				});
			} else { 
				res.send('error'); 
			}
		});


	});

	// forget password
	app.get('/forgotpass', function(req, res) {
		var uname = req.query.uname;
		var pswrd = req.query.newpass;
		userDBupdate(userParamsUserUpdatePass({
			uname: uname,
			pswrd: pswrd
		}), function(done) {
			if (done) { res.send('done'); }
			else { res.send('error'); }
		});
	});

	// login
	app.get('/login', function(req, res) {
		var uname = req.query.uname;
		var pswrd = req.query.pswrd;
		userDBFind(userParamsFindLogin({
			uname: uname
		}), 'pswrd', function(check) {
			if (pswrd == check) { res.send('done'); }
			else { res.send('error'); }
		});
	});

	// ********************************************* USER PARAMS

	// ************************* USER PUT
	var userParamsPutNew = function(params) {
		return {
			Item: {
				email: { S: params.email },
				uname: { S: params.uname },
				pswrd: { S: params.pswrd },
				token: { S: params.token },
				confm: { BOOL: false }
			},
			TableName: 'usersTest'
		};
	};
	// ************************* USER CONFIRMATION CHECK
	var userParamsFindConfirm = function(params) {
		return {
			KeyConditions: {
				uname: {
					ComparisonOperator: 'EQ',
					AttributeValueList: [{ S: params.uname }]
				}
			},
			TableName: 'usersTest',
			AttributesToGet: ['token']
		};
	};
	// ************************* USER LOGIN CHECK
	var userParamsFindLogin = function(params) {
		return {
			KeyConditions: {
				uname: {
					ComparisonOperator: 'EQ',
					AttributeValueList: [{ S: params.uname }]
				}
			},
			TableName: 'usersTest',
			AttributesToGet: ['pswrd']
		};
	};
	// ************************* USER CONFIRMATION UPDATE
	var userParamsUpdateConfirmation = function(params) {
		return {
			Key: { uname: { S: params.uname } },
			TableName: 'usersTest',
			AttributeUpdates: {
				confm: { Action: 'PUT', Value: { BOOL: true } }
			}
		};
	};
	// ************************* USER PASSWORD UPDATE
	var userParamsUserUpdatePass = function(params) {
		return {
			Key: { uname: { S: params.uname } },
			TableName: 'usersTest',
			AttributeUpdates: {
				pswrd: { Action: 'PUT', Value: { S: params.pswrd } }
			}
		};
	};
	// ************************* USER EXISTS
	var userParamsUserExists = function(params) {
		return {
			KeyConditionExpression: 'uname = :p1',
			ExpressionAttributeValues: {
				':p1': {'S': params.uname}
			},
			TableName: 'usersTest',
		};
	};
	
	// ********************************************* USER FUNCTIONS
	
	// ************************* USER PUT
	function userDBput(params, callback) {
		dynamodb.putItem(params, function(err, data) {
			if (err) { callback(false); }
			else { callback(true); }
		});
	}
	// ************************* USER FIND
	function userDBFind(params, want, callback) {
		dynamodb.query(params, function(err, data) {
			var get = '';
			if (err) { console.log(err, err.stack); }
			if (data.Items.length == 1) {
				get = data.Items[0][want].S;
			}
			callback(get);
		});
	}
	// ************************* USER UPDATE INFO
	function userDBupdate(params, callback) {
		dynamodb.updateItem(params, function(err, data) {
			if (err) { callback(false); }
			else { callback(true); }
		});
	}
	// ************************* USER EXISTS
	function userDBuserExists(params, callback) {
		dynamodb.query(params, function(err, data) {
			if (err) { console.log(err, err.stack); }
			if (data.Items.length > 0) { callback(true); }
			else {callback(false); }
		});
	}

	// ********************************************* MAILER START

	var mailOptions = function(to, subject, body) {
  		return {
    		from: 'Hello <helloworldtestingemail@gmail.com>',
    		to: to, // string of recipients separated by commas
    		subject: subject,
    		html: body
		};
	};

	function sendEmail(to, subject, body) {
		var emailOptions = mailOptions(to, subject, body);
		transporter.sendMail(emailOptions, function(error, info){
			if(error) { console.log(error); }
			else { console.log('Message sent: ' + info.response); }
		});
	}

}
