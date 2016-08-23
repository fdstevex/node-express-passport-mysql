/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
CREATE TABLE `' + dbconfig.database + '`.`' + dbconfig.users_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `email` VARCHAR(512) NOT NULL, \
    `password` CHAR(60) NOT NULL, \
        PRIMARY KEY (`id`), \
  `reset_password_token` varchar(66) DEFAULT NULL, \
  `reset_password_token_generated` datetime DEFAULT NULL, \
  `email_verification_token` varchar(66) DEFAULT NULL, \
  `email_verification_token_generated` DATETIME DEFAULT NULL, \
  `email_verified` char(1) NOT NULL DEFAULT 0, \
  `apikey` varchar(66) DEFAULT NULL, \
  `num_failed_login_attempts` INT NOT NULL DEFAULT 0, \
    UNIQUE INDEX `id_UNIQUE` (`id` ASC), \
    UNIQUE INDEX `email_UNIQUE` (`email` ASC), \
    UNIQUE INDEX `apikey_UNIQUE` (`apikey` ASC), \
  KEY `email_verification_token` (`email_verification_token`), \
  KEY `reset_password_token` (`reset_password_token`) \
)');

console.log('Success: Database Created!')

connection.end();
