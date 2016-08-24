# Node Authentication with MySQL

This is a simple authentication starting point for an ExpressJS based app using PassportJS for authentication, adding some basic account management functions including email address verification, reset password, and a forgot password workflow.

Provides a REST style API, and assumes that the clients are smart clients capable of communicating this way, be they apps, or web pages using jQuery, Angular, or any other web framework.

Originally based on the scotch.io tutorial series: Complete Guide to Node Authentication with MongoDB

## Instructions

If you would like to download the code and try it for yourself:

1. Clone the repo: `git clone git@github.com:fdstevex/node-express-passport-mysql.git`
1. Install packages: `npm install`
1. Copy the email configuration `config/email.js.sample` to `config/email.js` and update with your SMTP settings.
1. Edit the database configuration: `config/database.js`
1. Create the database schema: `node scripts/create_database.js`
1. Launch: `node server.js`

There is no default web interface, so what you get is a server that will accept API requests at /auth as described below.

# API

## Register

```
POST /auth/users

{"email":"me@example.com","password":"secret"}
```

Response

```
{"status":"success","data":{"emailVerificationRequired":true}}
```

A successful register request will come with a 200 response, and sends the user an email with a verification token.  Once the user clicks the link in the email, they will be able to log in.

## Verify Email Address

The user clicks the email verification link in the email they receive on signup.

```
GET /auth/verify_email_address?token=1f9c593a127d44806c9b5eabc582216ed18dd0117fe2e62437c1e50685dfe40a
```

A successful email verification routes to `/email_verified.html`, and a failure redirects to `/email_verification_failed.html`.  This is done in accounts.js, you can change the URLs there.

## Login

Request the login endpoint using a simple GET request with a basic HTTP authorization header.

```
GET /auth/login HTTP/1.1
Authorization: Basic eHN0ZXZlKzNAZ21haWwuY29tOmJvYjI=
```

Login Response

```
{"status":"success","data":{"apikey":"638f7b5755ffb14119c31fd9a94c189f952f714acd94d9d2bd0b0b8f35686c88"}}
```

Provide the apikey as a query parameter to endpoints that require authorization.  See app/api.js for an example.

## Change Password

```
POST /auth/changepass?apikey=638f7b5755ffb14119c31fd9a94c189f952f714acd94d9d2bd0b0b8f35686c88 HTTP/1.1

{"oldpass":"pwd","newpass":"pwd2"}
```

Change Password Response

```
{"status":"success","data":null}
```

## Reset Password

Reset password requires a number of steps.  The first step is requesting the server send an email to the user with a reset password link.

```
POST /auth/sendresetpass HTTP/1.1

{"email":"me@example.com"}
```

This sends an email to the user, with a reset password token. This links to `/reset_password.html`, which presents a form that asks the user to enter a new password.  The submit button POSTs a request:

```
POST /auth/resetpass HTTP/1.1

{"token": "be18df83b5fcc360308edb23938e7e5de0696f1da9cb026b70c422b206cf9fff", "password": "secret"}
```

This will respond with 

```
{"status":"success","data":null}
```

## Errors

Errors or exceptions (things that should not happen) are represented as:

```
{"status": "error", "message": "Unexpected, internal error"}
```

Normal failures (like a duplicate email address, for example) are indicate with a `status: fail`. 

```
{"status": "fail", "data": { "message": "Invalid apikey"}}
```

# Future

* One significant missing feature is throttling of password reset requests.
* Passwords are sent over the wire unencrypted; they're stored salted and hashed.  This assumes a TLS connection but that isn't enforced.
* No password strength checking is done.
