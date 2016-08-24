// config/database.js
module.exports = {
    'connection': {
        'host': 'localhost',
        'user': 'root',
        'password': undefined
    },
	'database': 'expresso',
    'users_table': 'accounts',

    'require_email_verification': true,
    'verify_link': "http://localhost:8080/auth/verify_email_address?token=",
    'resetpass_link': "http://localhost:8080/reset_password.html?token=",
    'verified_redirect': '/'
};
