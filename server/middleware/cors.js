'use strict';

const config = require('../configs');
const originDefault = config.cors.default;
const origins = new RegExp(config.cors.origin);

module.exports = function (req, res, next) {
	if (!req.headers.origin) {
		return req.method === 'options' ? res.end() : next();
	}
	var origin = origins.test(req.headers.origin) ? req.headers.origin : originDefault;
	res.header("Access-Control-Allow-Origin", origin);
	res.header("Access-Control-Allow-Credentials", true);
	res.header("Access-Control-Allow-Methods", 'GET, POST, PUT, DELETE');
	res.header("Access-Control-Allow-Headers", 'Origin, Content-Type, Accept, Authorization');
	req.method === 'options' ? res.end() : next();
};
