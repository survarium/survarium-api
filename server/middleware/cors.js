'use strict';

const config = require('../configs');
const origins = config.cors.origin.split(';');

module.exports = function (req, res, next) {
	if (!req.headers.origin) {
		return req.method === 'options' ? res.end() : next();
	}
	var origin = origins.indexOf(req.headers.origin);
	res.header("Access-Control-Allow-Origin", origins[origin] || origins[0]);
	res.header("Access-Control-Allow-Credentials", true);
	res.header("Access-Control-Allow-Methods", 'GET, POST, PUT, DELETE');
	res.header("Access-Control-Allow-Headers", 'Origin, Content-Type, Accept, Authorization');
	req.method === 'options' ? res.end() : next();
};
