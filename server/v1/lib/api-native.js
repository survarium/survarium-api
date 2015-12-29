const config = require('../../configs');
const api = new (require('survarium-api-client').v0)({ keyPriv: config.api.keys.private, keyPub: config.api.keys.public });

const delay = (function () {
	// MAX 5 RPS
	var min = 400;
	var max = 600;
	var diff = max - min;
	return function () {
		return min + (Math.random() * diff) >>> 0;
	};
})();

Object.defineProperty(api, 'delay', {
	get: delay
});

module.exports = api;
