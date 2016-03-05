var mongoose     = require('mongoose');
var Promise      = require('bluebird');
var config       = require('../../configs');

Promise.config({
	// Enables all warnings except forgotten return statements.
	warnings: {
		wForgottenReturn: false
	}
});

mongoose.Promise = Promise;

var uri = config.v1.db.uri;

const connection = mongoose.createConnection(uri, config.v1.db.options || {});

connection
	.on('connected', function () {
		console.info('connected to', uri);
	})
	.on('error', function (err) {
		console.error('cannot connect to', uri, err);
	});

module.exports = connection;
