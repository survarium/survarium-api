'use strict';

const api = new (require('survarium-api-client').v0)({ keyPriv: 'test', keyPub: 'test' });
const handlers = api.__handlers;
const handlersNames = Object.keys(handlers);

const index = function (req, res) {
	const baseUrl = req.protocol + '://' + req.hostname + req.baseUrl;

	let handlersList = handlersNames.reduce(function (result, method) {
		result[method] = baseUrl + '/' + method;
		return result;
	}, {});

	res.json(handlersList);
};

const cmd = function (req, res, next) {
	let cmd = req.params.cmd;

	if (!api[cmd]) {
		return res.status(401).send('no method ' + cmd + ' available');
	}

	let query = req.query;

	api
		[cmd](query)
		.then(function (data) {
			res.json(data);
			return data;
		})
		.catch(next);
};

exports.index = index;
exports.cmd = cmd;
