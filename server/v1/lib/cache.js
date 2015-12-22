var Redis = require('ioredis');
var redis = new Redis({
	keyPrefix: 'sv-api:v1:'
});

redis
	.on('ready', function () {
		console.info('redis connected');
	})
	.on('error', function (err) {
		console.error('redis error', err);
	});

module.exports = redis;
