'use strict';

const Promise = require('bluebird');
const cache   = require('../../lib/cache');

function importStats () {
	var pfx = 'sv-api:v1:';
	return cache
		.keys(`${pfx}matches:load:*last`)
		.then(function (result) {
			if (!result || !result.length) {
				return next(new Error('no information available'));
			}
			return Promise
				.props(result.reduce(function (promises, key) {
					key = key.replace(pfx, '');
					promises[key] = cache
						.hgetall(key)
						.then(function (meta) {
							meta.date = new Date(meta.ts * 1000);
							return meta;
						});
					return promises;
				}, {}))
		});
}

exports.stats = importStats;
