'use strict';

const model = require('./model');
const events = require('./events');
const bot = require('../../lib/telegram');
const cache = require('../../lib/cache');
const utils = require('../../lib/utils');
const config = require('../../../configs');
const hostname = config.v1.telegram.hostname;
const CACHEKEY = `telegram:${hostname}`;

var importStatus = (function () {
	var types = {
		fatal: {
			cache: 60 * 30,
			message: (status, time) => `[${hostname}] Import FATAL on time=${time}.\n${status.error.message}${status.error.path ? ': ' + status.error.path : ''}`
		},
		tooMuchErrors: {
			cache: 60 * 5,
			message: (status, time) => `[${hostname}] Import TOO MUCH ERRORS (${status.errors}/${status.total}) on time=${time} and match=${status.lastErrorMatch}.\n${status.lastError.message}${status.lastError.path ? ': ' + status.lastError.path : ''}`
		},
		noUpdates: {
			cache: 60 * 60 * 24,
			message: (status, time) => `[${hostname}] Import NO UPDATES from ${time}`
		},
		unknown: {
			cache: 0,
			message: (status, time) => `[${hostname}] Import UNKNOWN ERROR`
		}
	};

	var event = events.IMPORT_STATUS;

	return (status) => {
		var type = types[status.type] || types.unknown;
		var time = utils.time(new Date(status.ts * 1000));
		var message = type.message(status, time);
		var CacheKey = `${CACHEKEY}:${event}`;
		return model
			.find({ events: { $elemMatch: { $eq: event } } }, 'chat')
			.lean()
			.then(function (result) {
				if (!result || !result.length) {
					return;
				}
				result.forEach(function (subscriber) {
					let chatId = subscriber.chat;
					let cacheKey = `${CacheKey}:${chatId}`;
					return cache
						.get(cacheKey)
						.then(function (cached) {
							if (cached) {
								return;
							}
							return bot.sendMessage(chatId, message)
								.tap(function () {
									return cache.setex(cacheKey, type.cache, true);
								});
						})
						.catch(bot.handleError.bind(bot, chatId));
				});
			});
	}

})();

exports.importStatus = importStatus;
