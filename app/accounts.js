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
		console.log("auth/login");

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
			            return res.json({ status: 'error', message: "Unexpected adding user"});
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

	router.post("/resetpass", function(req, res) {

	});

	return router;
};

