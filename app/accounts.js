// Express stuff
var express = require('express');
var bodyParser = require('body-parser')

// Database connection stuff
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('../config/database');
var connection = mysql.createConnection(dbconfig.connection);

// Email
var mailer = require('../config/email');

connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {
	var router = express.Router();
	router.use(bodyParser.json());

	// TOOD: hanging this off the router is not the right way to do this, but the api needs a way to authenticate users
	router.userFromApikey = function(apikey, callback) {
		connection.query("SELECT * FROM ?? WHERE apikey = ?", [dbconfig.users_table, apikey], function(err, rows) {
			if (rows && rows.length == 1) {
				callback(rows[0]);
			} else {
				callback(undefined);
			}
		});
	};

	// Register
	router.post("/users", function(req, res) {
		// Look for preconditions
		if (!req.body) {
			res.status(500).send({ status: 'error', message: "JSON body missing email or password"})
			return;
		}

		var email = req.body.email;
		var password = req.body.password;

		if (!email || !password) {
			res.status(500).send({status: 'error', message: "JSON body missing email or password"})
			return;
		}

	    connection.query("SELECT * FROM ?? WHERE email = ?",[dbconfig.users_table, email], function(err, rows) {
	        if (err)
	            return res.json({ status: 'error', message: "Unexpected error check for user"});
	        if (rows.length) {
	            return res.json({ status: "fail", data: { code: 'accountExists', message: "There is already an account using that email address."}});
	        } else {
	            // if there is no user with that email
	            // create the user
	            password = bcrypt.hashSync(password, null, null);
	            apikey = require('crypto').randomBytes(32).toString('hex');

	            var insertQuery = "INSERT INTO ?? ( email, password, email_verification_token, email_verification_token_generated, apikey ) values (?,?,?,?,?)";

	            var verifyToken = require('crypto').randomBytes(32).toString('hex');

	            connection.query(insertQuery,[dbconfig.users_table, email, password, verifyToken, new Date(), apikey],function(err, rows) {
	            	if (err) {
			            return res.json({ status: 'error', message: "Unexpected error adding user"});
	            	}

	                mailer.send(email, "Email Verification", "Please click the link below to verify your email address.\r\n\r\n" + dbconfig.verify_link + verifyToken);

	                return res.json({ status: "success", data: { emailVerificationRequired: true }});
	            });
	        }
	    });
	});

	// Email Verify
	// Verification token is in query string value 'token'
	router.get("/verify_email_address", function(req, res) {
		// render the page and pass in any flash data if it exists
		var token = req.query.token;

		connection.query("SELECT email_verified FROM ?? WHERE email_verification_token = ?", [dbconfig.users_table, token], function(err, rows) {
			if (!rows)  {
				return res.redirect('/email_verification_failed.html');
			}

			connection.query("UPDATE ?? SET email_verified=1 WHERE email_verification_token = ?",[dbconfig.users_table, token], function(err, rows){
				if (!err) {
					res.redirect('/email_verified.html');
				} else {
					res.redirect('/email_verification_failed.html');
				}
		    });
		});
	});

	// Log In - Exchange email and password for an apikey
	router.get("/login", 
		passport.authenticate('basic'), 
		  function(req, res) {
		  	if (!req.user.email_verified) {
		  		return res.json({ success: false, status: "emailNotVerified", message: "Email address verification not completed."});
		  	}
		  	return res.json({ status: 'success', data: { apikey: req.user.apikey }});
		  }
	);

	router.post("/changepass", function(req, res) {
		// The use is already authenticated, but we need to verify the password in the request

		if (!req.query.apikey) {
			return res.status(403).send({status: 'fail', data: { message: 'missing apikey' }})
		}

		router.userFromApikey(req.query.apikey, function(user) {
			if (!user) {
				return res.status(403).send({status: 'fail', data: { message: 'Invalid apikey'}});
			}

			if (!req.body.oldpass || !req.body.newpass) {
				return res.status(403).send({status: 'fail', data: { message: 'oldpass and newpass must be specified'}});
			}

            if (!bcrypt.compareSync(req.body.oldpass, user.password)) {
				return res.status(403).send({status: 'fail', data: { message: 'oldpass incorrect'}});
            }

			password = bcrypt.hashSync(req.body.newpass, null, null);
			connection.query("UPDATE ?? SET password=? WHERE ??.id = ?",[dbconfig.users_table, password, dbconfig.users_table, user.id], function(err, rows) {
				if (err || rows.changedRows != 1) {
					return res.status(500).send({status: 'fail', data: { message: 'Password update request failed'}});
				}

				return res.send({status: 'success', data: null});
		    });
		});
	});

	// Send Reset Password email.
	router.post("/sendresetpass", function(req, res) {
		// Look for preconditions
		if (!req.body) {
			res.status(500).send({ status: 'error', message: "JSON body missing email or password"})
			return;
		}

		var email = req.body.email;

		if (!email) {
			res.status(500).send({status: 'error', message: "missing email"})
			return;
		}

	    connection.query("SELECT * FROM ?? WHERE email = ?",[dbconfig.users_table, email], function(err, rows) {
	        if (err)
	            return res.json({ status: 'error', message: "Unexpected error check for user"});
	        if (rows.length != 1) {
	            return res.status(404).json({ status: "fail", data: { code: 'notFound', message: "No user with that email address"}});
	        } else {
	        	// Generate a password reset token
	        	var user = rows[0];

	            token = require('crypto').randomBytes(32).toString('hex');

	            var insertQuery = "UPDATE ?? SET reset_password_token=?, reset_password_token_generated=? WHERE id=?";

	            connection.query(insertQuery,[dbconfig.users_table, token, new Date(), user.id],function(err, rows) {
	            	if (err) {
	            		console.log(err);
			            return res.json({ status: 'error', message: "Unexpected error"});
	            	}

	                mailer.send(email, "Reset Password", "Please click the link below to change your password.  If you didn't request a password reset, you can ignore this message.\r\n\r\n" + dbconfig.resetpass_link + token);

	                return res.json({ status: "success", data: null});
	            });
	        }
	    });	
	});

	// Process the reset password request
	router.post("/resetpass", function(req, res) {

		var token = req.body.token;
		var newpass = req.body.password;

		if (!token || !newpass) {
			res.status(400).send({status: 'fail', message: "password and token fields are required"})
			return;
		}

		// The use is already authenticated, but we need to verify the password in the request
	    connection.query("SELECT * FROM ?? WHERE reset_password_token = ?",[dbconfig.users_table, token], function(err, rows) {
	        if (err)
	            return res.status(500).json({ status: 'error', message: "Unexpected error checking for user"});
	        if (rows.length != 1) {
	            return res.status(404).json({ status: "fail", data: { code: 'notFound', message: "Unable to reset password. Password reset token may have expired."}});
	        } 

	        var user = rows[0];
			password = bcrypt.hashSync(newpass, null, null);
			connection.query("UPDATE ?? SET password=? WHERE ??.id = ?",[dbconfig.users_table, password, dbconfig.users_table, user.id], function(err, rows) {

				if (err || rows.changedRows != 1) {
					return res.status(500).send({status: 'fail', data: { message: 'Password update request failed'}});
				}

				return res.send({status: 'success', data: null});
		    });
		});
	});

	return router;
};

