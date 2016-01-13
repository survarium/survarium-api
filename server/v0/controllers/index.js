'use strict';

const api = new (require('survarium-api-client').v0)();
const handlers = api.__handlers;
const handlersNames = Object.keys(handlers);
const handlersNamesLowered = handlersNames.reduce(function (methods, method) {
	methods[method.toLowerCase()] = method;
	return methods;
}, {});

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
	let method = api[cmd] ? cmd :
		api[handlersNamesLowered[cmd]] ? handlersNamesLowered[cmd] : null;

	if (!method) {
		return res.status(401).send(`no method ${cmd} available`);
	}

	let query = req.query;

	api[method].call(api, query)
		.then(function (data) {
			res.json(data);
			return data;
		})
		.catch(next);
};

exports.index = index;
exports.cmd = cmd;
