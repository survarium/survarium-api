var mongoose     = require('mongoose');
mongoose.Promise = require('bluebird');
var config       = require('../../configs');

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
