const config = require('../../configs');
const api = new (require('survarium-api-client').v0)({ keyPriv: config.api.keys.private, keyPub: config.api.keys.public }, {
	retries: 25
});

const delay = (function () {
	// MAX 5 RPS
	var min = +process.env.DELAY_MIN || 0;
	var max = +process.env.DELAY_MAX || 150;
	var diff = max - min;
	return function () {
		return min + (Math.random() * diff) >>> 0;
	};
})();

Object.defineProperty(api, 'delay', {
	get: delay
});

module.exports = api;
