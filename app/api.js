// Express stuff
var express = require('express');
var bodyParser = require('body-parser')

module.exports = function(app, passport, accounts) {
	var router = express.Router();
	router.use(bodyParser.json());

	router.use(function(req, res, next) {
		if (!req.query.apikey) {
			return res.status(403).send({status: 'fail', data: { message: 'missing apikey' }})
		}

		accounts.userFromApikey(req.query.apikey, function(user) {
			if (user) {
				next();
			} else {
				return res.status(403).send({status: 'fail', data: { message: 'invalid apikey' }})
			}
		});
	});

	// Simple echo function
	router.post("/echo", function(req, res) {
		res.json(req.body);
	});

	return router;
};
