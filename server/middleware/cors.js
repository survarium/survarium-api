'use strict';

module.exports = function (req, res, next) {
	//res.header("Access-Control-Allow-Origin", 'http://survarium.pro');
	res.header("Access-Control-Allow-Credentials", true);
	res.header("Access-Control-Allow-Methods", 'GET, POST, PUT, DELETE');
	res.header("Access-Control-Allow-Headers", 'Origin, Content-Type, Accept, Authorization');
	next();
};
