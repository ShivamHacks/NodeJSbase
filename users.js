module.exports = function(app, dynamodb, s3, fs, shortid, transporter, multipartMiddleware) {

	// ********************************************* USER REQUESTS

	// sign up
	app.post('/newuser', multipartMiddleware, function (req, res) {
		var username = req.body.uname;
		var email = req.body.email;
		var password = req.body.pswrd;
		console.log(username);
		userDBFind(userParamsFind({
			username: username,
			get: ['email'],
			table: 'usersTest'
		}), function(data) {
			if (data.Items.length == 1) {
				res.send('error'); 
			} else {

				var picture = fs.readFileSync(req.files.picture.path);
				var confirm_token = shortid.generate();

				var dbParams = userParamsPutDB({
					username: username,
					email: email,
					password: password,
					picture: 'none yet',
					confirmed: false,
					confirm_token: confirm_token
				});

				var s3Params = userParamsPutS3({
					username: username,
					picture: picture
				});

				var callback = function(done) {
					if (done) {
          				// EMAIL FOR CONFIRMATION
          				var emailTemp = require('./temps/email_confirm.json');
          				var body = emailTempBody({
          					temp: emailTemp,
          					keys: ['uname', 'email', 'pswrd', 'token'],
          					vals: [username, email, password, confirm_token]
          				});
          				sendEmail(mailOptions(email, body));
          				res.send('done');
          			} else {
          				res.send('error');
          			}
          		};
          		userPut(dbParams, s3Params, callback);
          	}
          });
});

	// confirm account
	app.get('/confirm', function(req, res) {
		var username = req.query.uname;
		var email = req.query.email;
		var confirm_token = req.query.token;
		userDBFind(userParamsFind({ 
			username: username,
			get: ['confirm_token'],
			table: 'usersTest'
		}), function(data) {
			if (data.Items.length == 1) {
				var check = data.Items[0].confirm_token.S;
				if (confirm_token == check) {
					userDBupdate(userParamsUpdate({
						username: username,
						table: 'usersTest',
						attribute: 'confirmed',
						value: { BOOL: true }
					}), function(done) {
						if (done) { res.send('done'); }
						else { res.send('error'); }
					});
				} else { res.send('error'); }
			} else { res.send('error'); }
		});
	});

	// login
	app.get('/login', function(req, res) {
		var username = req.query.uname;
		var password = req.query.pswrd;
		userDBFind(userParamsFind({
			username: username,
			get: ['password', 'confirmed'],
			table: 'usersTest'
		}), function(data) {
			if (data.Items.length == 1) {
				if (password == data.Items[0].password.S && data.Items[0].confirmed.BOOL) { 
					res.send('done');
				} else { 
					res.send('error'); 
				}
			} else { 
				res.send('error'); 
			}
		});
	});

	// ********************************************* USER PARAMS

	// ************************* USER PUT
	var userParamsPutDB = function(params) {
		return {
			Item: {
				username: { S: params.username },
				email: { S: params.email },
				password: { S: params.password },
				picture: { S: params.picture },
				confirmed: { BOOL: params.confirmed },
				confirm_token: { S: params.confirm_token },
			},
			TableName: 'usersTest'
		};
	};
	var userParamsPutS3 = function(params) {
		return {
			Bucket: 'userstest', 
			Key: params.username, 
			Body: params.picture,
			ACL: 'public-read'
		};
	};
	// ************************* USER FIND
	var userParamsFind = function(params) {
		return {
			KeyConditions: {
				username: {
					ComparisonOperator: 'EQ',
					AttributeValueList: [{ S: params.username }]
				}
			},
			TableName: params.table,
			AttributesToGet: params.get
		};
	};
	// ************************* USER UPDATE
	var userParamsUpdate = function(params) {
		var filledParams = {
			Key: { username: { S: params.username } },
			TableName: params.table,
			AttributeUpdates: {}
		};
		filledParams.AttributeUpdates[params.attribute] = { Action: 'PUT', Value: params.value };
		console.log(filledParams);
		return filledParams;
	};

	// ********************************************* USER FUNCTIONS
	
	// ************************* USER PUT
	function userPut(paramsDB, paramsS3, callback) {
		// if no profile pic is present, a blank one is created
		s3.upload(paramsS3, function(err, data) {
			if (err) { callback(false); }
			else {
				paramsDB.Item.picture.S = data.Location;
				dynamodb.putItem(paramsDB, function(err, data) {
					if (err) { callback(false); }
					else { callback(true); }
				});
			}
		});	
	}
	// ************************* USER FIND
	function userDBFind(params, callback) {
		dynamodb.query(params, function(err, data) {
			if (err) { console.log(err, err.stack); }
			callback(data);
		});
	}
	// ************************* USER UPDATE INFO
	function userDBupdate(params, callback) {
		dynamodb.updateItem(params, function(err, data) {
			console.log(data);
			if (err) { callback(false); }
			else { callback(true); }
		});
	}

	// ********************************************* MAILER START

	var emailTempBody = function(params) {
		// issue occured where the temp itself was being editted. lolol
		var temp = JSON.parse(JSON.stringify(params.temp));
		var body = params.temp.body;
		var keys = params.keys;
		var vals = params.vals;
		if (keys.length == vals.length) {
			for (i = 0; i < keys.length; i++) {
				var replaceKey = new RegExp('%' + keys[i] + '%', "g");
				body = body.replace(replaceKey, vals[i]);
			}
		}
		temp.body = body;
		return temp;
	};

	var mailOptions = function(to, emailTemp) {
		return {
			from: 'Hello <helloworldtestingemail@gmail.com>',
    		to: to, // string of recipients separated by commas
    		subject: emailTemp.subject,
    		html: emailTemp.body
    	};
    };

    function sendEmail(mailOptions) {
    	transporter.sendMail(mailOptions, function(error, info){
    		if(error) { console.log(error); }
    		else { console.log('Message sent: ' + info.response); }
    	});
    }

}




// Return token/id when user is logged in to retrieve stuff.
  // also add an array of mobile push tokens for each device on user put???



/*

	// forgot password
	app.get('/forgotpass', function(req, res) {
		// here send email that provides user with password change token and if on android device, a link to click.
		var username = req.query.uname;
		var email = req.query.email;
		userDBFind(userParamsFind({
			username: username,
			get: ['email'],
			table: 'usersTest'
		}), function(data) {
			if (data.Items.length == 1) {
				var check = data.Items[0]['email'].S;
				if (email == check) {
					var token = shortid.generate();
					userDBupdate(userParamsUpdate({
						uname: uname,
						table: 'usersTest',
						attr: 'pass_reset_token',
						value: { S: token }
					}), function(done) {
						if (done) {
							var emailTemp = require('./temps/password_reset.json');
							var body = emailTempBody({
								temp: emailTemp,
								keys: ['token'],
								vals: [token]
							});
							emailTemp.body = body;
							console.log(emailTemp);
							sendEmail(mailOptions(email, emailTemp));
							res.send('done');
						} else { res.send('error'); }
					});
				} else { res.send('error'); }
			} else { res.send('error'); }
		});
	});

	// change password
	app.get('/changepass', function(req, res) {
		var uname = req.query.uname;
		var token = req.query.token;
		var pswrd = req.query.newpass;
		userDBFind(userParamsFind({
			uname: uname,
			get: ['token'],
			table: 'usersTest'
		}), function(data) {
			if (data.Items.length == 1) {
				userDBupdate(userParamsUpdate({
					uname: uname,
					attr: 'pswrd',
					value: { S: pswrd },
					table: 'usersTest'
				}), function(done) {
					if (done) { res.send('done'); }
					else { res.send('error'); }
				});
			} else { res.send('error'); }
		});
	});

*/



	//function passwordResetEmail(to, token) {
		//var emailOptions = mailOptions(to, 'Password Reset', );
	//}


	// ************************* USER CONFIRMATION UPDATE
	/*var userParamsUpdateConfirmation = function(params) {
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
	};*/
	
	
	// ************************* USER CONFIRMATION CHECK
	/*var userParamsFindConfirm = function(params) {
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

	

	// ************************* USER EXISTS
	function userDBuserExists(params, callback) {
		dynamodb.query(params, function(err, data) {
			if (err) { console.log(err, err.stack); }
			if (data.Items.length > 0) { callback(true); }
			else {callback(false); }
		});
	}


	*/



		/*console.log(paramsDB, paramsS3);
		dynamodb.putItem(paramsDB, function(err, data) {
			if (err) { callback(false); }
			else {
				s3.upload(paramsS3, function(err, data) {
					console.log(err, data);
					if (err) { callback(false); }
					else {
						callback(true);
					}
				});

			}
		});*/
