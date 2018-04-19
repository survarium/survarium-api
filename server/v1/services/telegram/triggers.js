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
			message: (status, time) => `[${hostname}] Import FATAL ${time ? 'on time=' + time + ' and ' : ''}id=${status.match}.\n${status.error.message}${status.error.path ? ': ' + status.error.path : ''}`
		},
		tooMuchErrors: {
			cache: 60 * 5,
			message: (status, time) => `[${hostname}] Import TOO MUCH ERRORS (${status.errors}/${status.total}) ${time ? 'on time=' + time + ' and ' : ''}match=${status.lastErrorMatch}.\n${status.lastError.message}${status.lastError.path ? ': ' + status.lastError.path : ''}`
		},
		noUpdates: {
			cache: 60 * 60 * 12,
			message: (status, time) => `[${hostname}] Import NO UPDATES from ${time}`
		},
		unknown: {
			cache: 0,
			message: (status, time) => `[${hostname}] Import UNKNOWN ERROR`
		},
		clanwar: {
			cache: 0,
			message: (status, time) => `[${hostname}] Clanwar ${status.match} imported`
		}
	};

	var event = events.IMPORT_STATUS;

	return (status) => {
		var type = types[status.type] || types.unknown;
		var time = status.ts ? utils.time(new Date(status.ts * 1000)) : false;
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
									return type.cache && cache.setex(cacheKey, type.cache, true);
								});
						})
						.catch(bot.handleError.bind(bot, chatId));
				});
			});
	}

})();

var devmessage = (function (storage) {
	var running;

	var next = function (done) {
		if (done) {
			running = false;
		}
		if (running) {
			return;
		}
		var params = storage.shift();
		if (!params) {
			return;
		}
		post(params);
	};

	var post = function (params) {
		running = true;

		let message = params.message;
		let dev     = params.dev;
		let url     = params.url;

		let text = message.text;

		text = text
			.replace(/^\s+/, '')
			.replace(/<\/blockquote>/gm, '\n')
			.replace(/<br>/gm, '\n')
			.replace(/&quot;/gm, '"')
			.replace(/<cite>((?:.|\n)*?)<\/cite>/gm, '__italic__$1__/italic__\n')
			.replace(/<(?:.|\n)*?>/gm, '')
			.replace(/__italic__/gm, '<i>')
			.replace(/__\/italic__/gm, '</i>');

		const head = `<b>${dev.name}</b>: ${message.topic.id ? '<a href="' + url + '">' + (message.topic.name || message.forum.name) + '</a>' : ''}\n`;
		const SIZE = 4096 - head.length;

		const length = text.length;

		let send = function (text) {
			let print = `${head}${text}`;
			config.v1.telegram.channels.forEach((channel) => {
				bot.sendMessage(channel, print, {
				    parse_mode: 'HTML',
                    disable_web_page_preview: true
				});
			});
		};

		if (length < SIZE) {
			send(text);
		} else {
			for (let size = 0; size < length;) {
				let chunk = text.substr(size, SIZE);
				let lastDot = chunk.lastIndexOf('.');
				if (lastDot !== -1) {
					lastDot += 1;
					send(text.substr(size, lastDot));
					size += lastDot;
				} else {
					send(chunk);
					size += SIZE;
				}
			}
		}

		setTimeout(() => { next(true) } , Math.random() * 1000 + 1000);
	};

	return function (params) {
		storage.push(params);
		next();
	};
})([]);

exports.devmessage = devmessage;
exports.importStatus = importStatus;
