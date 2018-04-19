'use strict';

var Discord = require('./index');
var debug = Discord.debug;
var config = require('../../../configs');

var channels = [];

Discord.bot({
	onReady: function getChannels(bot) {
        channels = bot.channels.findAll('name', config.discord.devChannel);
	}
});

var sendMessage = Discord.sendMessage;

function toMD(val) {
	debug('htmlToMD');
	return val.replace(/^\s+/, '')
		.replace(/<br>{1,}/gm, '\n')
		.replace(/&quot;/gm, '"')
		.replace(/<cite>((?:.|\n)*?)<\/cite>/gm, '*$1*\n')
		.replace(/<b>((?:.|\n)*?)<\/b>/gm, '**$1**')
		.replace(/<([^>]+) (style="([^"]*)font-weight: bold([^"]*)")([^>]*)>([^<]*)<\/[^<]+>/gm, '**$6**')
		.replace(/<a([^>]*) (href="([^"]*)")([^>]*)>([^<]*)<\/a>/igm, '$5 ($3)')
		.replace(/<(?:.|\n)*?>/gm, '')
		;
}

var devmessage = (function (storage) {
	var running;

	var next = function (done) {
		debug('devmessage:send');
		if (done) {
			debug('devmessage:send:sended');
			running = false;
		}
		if (running) {
			debug('devmessage:send:inProgress');
			return;
		}
		var message = storage.shift();
		if (!message) {
			debug('devmessage:send:stackIsEmpty');
			return;
		}

		running = true;

		debug('devmessage:send:exec');
		return sendMessage(channels, message)
			.then(() => {
				debug('devmessage:sent', message);
			})
			.catch(err => debug(err))
			.then(() => {
				next(true);
			});
	};

	var post = function (params) {
		debug('devmessage:prepare');

		let message = params.message;
		let dev     = params.dev;
		let url     = params.url;

		let text = toMD(message.text);

		const head = toMD(`<b>${dev.name}</b>: ${message.topic.id ? '<a href="' + url + '">' + (message.topic.name || message.forum.name) + '</a>' : ''}\n\n`);
		const SIZE = Discord.MAXSIZE - head.length;

		const length = text.length;

		let send = function (text) {
			debug('devmessage:prepare:addChunkToStack');
			let print = `${head}${text}`;
			storage.push(print);
			next();
		};

		if (length < SIZE) {
			debug('devmessage:prepare:short');
			send(text);
		} else {
			debug('devmessage:prepare:long');
			for (let size = 0; size < length;) {
				let chunk = text.substr(size, SIZE);
				let lastDot = chunk.lastIndexOf('.');
				if (lastDot !== -1) {
					debug('devmessage:prepare:long:dotChunk');
					lastDot += 1;
					send(text.substr(size, lastDot));
					size += lastDot;
				} else {
					debug('devmessage:prepare:long:chunk');
					send(chunk);
					size += SIZE;
				}
			}
		}
	};

	return function (params) {
		debug('devmessage:addToStack');
		post(params);
	};
})([]);

exports.devmessage = devmessage;
