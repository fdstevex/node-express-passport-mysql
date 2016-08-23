// config/passport.js

// load all the things we need
var BasicStrategy = require('passport-http').BasicStrategy;

// load up the user model
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('./database');
var connection = mysql.createConnection(dbconfig.connection);

connection.query('USE ' + dbconfig.database);

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        connection.query("SELECT * FROM ?? WHERE id = ? ",[dbconfig.users_table, id], function(err, rows){
            done(err, rows[0]);
        });
    });

    passport.use(new BasicStrategy(
      function(email, password, done) {

            connection.query("SELECT * FROM ?? WHERE email = ?",[dbconfig.users_table, email], function(err, rows){
                if (err)
                    return done(err);
                if (!rows.length) {
                    return done(null, false); 
                }

                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(password, rows[0].password)) {
                    return done(null, false); // create the loginMessage and save it to session as flashdata
                }

                // all is well, return successful user
                return done(null, rows[0]);
            });
      }
    ));
};
