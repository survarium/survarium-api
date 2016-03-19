'use strict';

const debug = require('debug')('importer:vg-messages');
const Promise = require('bluebird');
const db = require('../../../v1/lib/db');
const utils = require('../../../v1/lib/utils');
const config = require('../../../configs');
const developers = config.v2.developers;
const notifications = require('../../../v1/services/telegram/triggers');
const got = require('got');
const cheerio = require('cheerio');
const VgMessages = require('./model');

var gracefulShutdown;
var importInProgress;

function tryToShutdown() {
	if (gracefulShutdown) {
		console.log(`executing ${process.pid} shutdown...`);
		return process.nextTick(function () {
			process.exit(0);
		});
	}
}

var headers = {
	'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4',
	cookie: 'lang=ru'
};

var MAXPOST = 0;

const targets = [
	{
		lang: 'ru',
		search: {
			url: 'https://forum.survarium.com/ru/search.php?sr=posts&author_id='
		},
		topic: {
			url: 'https://forum.survarium.com/ru/viewtopic.php'
		},
		delay: 500
	},
	{
		lang: 'en',
		search: {
			url: 'https://forum.survarium.com/en/search.php?sr=posts&author_id='
		},
		topic: {
			url: 'https://forum.survarium.com/en/viewtopic.php'
		},
		delay: 500
	}
];

function parseDate(value) {
	if (!value) {
		return;
	}

	let match = value.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/);
	return new Date(Date.UTC(match[3], Number(match[2] - 1), match[1], match[4], match[5]));
}

function parseMessage(html, options) {
	let search = cheerio.load(html, { decodeEntities: false });
	let message = options.message;
	let $message = search(`#message_${message.post}`);
	message.text = $message.html();

	if (!message.text) {
		console.log(html);
	}

	return message.save();
}

function getMaxPost(dev) {
	return VgMessages
		.findOne({ dev: dev.id }, { post: 1 })
		.sort({ post: -1 })
		.lean()
		.exec()
		.then(function (post) {
			return post ? post.post : post;
		});
}

/**
 * Парсинг результатов поиска сообщений
 */
function parseSearch(html, options) {
	return getMaxPost(options.dev)
		.then(function (MAXPOST) {
			debug(`last ${options.dev.name} message is #${MAXPOST}`);

			let search = cheerio.load(html, { decodeEntities: false });
			let posts  = search('.search.post');

			let promises = [];

			posts.each(function (i, post) {
				let $post = search(post);

				let postURL = $post.find('.searchresults a').attr('href');

				let postId = Number(postURL.match(/p\=(\d+)/)[1]);

				if (postId <= MAXPOST) {
					return;
				}

				let topic  = postURL.match(/t\=(\d+)/);
				let forum  = postURL.match(/f\=(\d+)/);

				let message = new VgMessages({
					dev: options.dev.id,
					forum: { id: forum ? Number(forum[1]) : null },
					topic: { id: topic ? Number(topic[1]) : null },
					post : postId,
					lang : options.target.lang
				});

				message.url = `${options.target.topic.url}?f=${message.forum.id}&t=${message.topic.id}&p=${message.post}#p${message.post}`;

				let info   = $post.find('.postprofile');
				let topics = info.find('dd + dd a');
				let date   = $post.find('.postprofile .author ~ dd:first-of-type');

				message.forum.name = search(topics[0]).text();
				message.topic.name = search(topics[1]).text();

				message.date = parseDate(date.text());

				/**
				 * Планируем загрузку полного тела сообщения
				 */
				promises.push(function () {
					debug(`loading ${options.dev.name} message #${message.post} in ${options.target.lang} forum`);
					return got(message.url, {
						headers: headers
					})
						.then(function (response) {
							return parseMessage(response.body, { target: options.target, dev: options.dev, message: message });
						});
				});
			});

			if (!promises.length) {
				var error = search('#message p').text();
				if (!error || !error.length) {
					debug(`${options.dev.name} has no NEW messages in ${options.target.lang} forum`);
				}
				else if (!error.match(/(Подходящих\sтем\sили\sсообщений\sне\sнайдено|No\ssuitable\smatches\swere\sfound)/)) {
					throw new Error(error);
				} else {
					debug(`${options.dev.name} has no messages in ${options.target.lang} forum`);
				}
			}

			return promises;
		});
}

function loadMessages(messagesFn, params) {
	return new Promise(function (resolve) {
		var messages = [];
		var errors = [];
		var next = function () {
			var messageFn = messagesFn.shift();
			if (!messageFn) {
				return resolve({ messages: messages, errors: errors });
			}
			return Promise
				.delay(params.target.delay)
				.then(messageFn)
				.then(function (message) {
					messages.push(message);
				})
				.catch(function (err) {
					errors.push(err);
				})
				.then(next);
		};
		next();
	});
}

function loadTarget(target) {
	return new Promise(function (resolve, reject) {
		var targets = developers.slice();
		var errors = [];
		var done = 0;
		/**
		 * Поиск сообщений
		 */
		var next = function () {
			var dev = targets.shift();
			if (!dev) {
				if (errors.length) {
					return reject(new Error(JSON.stringify(errors, null, 2)));
				}
				return resolve(done);
			}
			var searchUrl = target.search.url + dev.id;
			debug(`loading ${dev.name} messages in ${target.lang} forum`);
			return Promise.delay(target.delay * 20).then(function () {
				return got(searchUrl, {
					headers: headers
				})
					.then(function (response) {
						return parseSearch(response.body, { target: target, dev: dev });
					})
					.then(function(messages) {
						return loadMessages(messages, { target: target, dev: dev });
					})
					.then(function (result) {
						console.log(JSON.stringify(result, null, 4));
						done++;
					})
					.catch(function (err) {
						errors.push({ lang: target.lang, dev: dev, searchError: true, err: err.message });
					})
					.then(next);
			});
		};
		next();
	});
}

function unique(array) {
	var u = {}, a = [];
	for (var i = 0, l = array.length; i < l; ++i) {
		if (u.hasOwnProperty(array[i])) {
			continue;
		}
		a.push(array[i]);
		u[array[i]] = 1;
	}
	return a;
}

/**
 * Выдрать значение кук, установленных сервером
 * @param   {Array}  cookie    headers['set-cookie']
 * @returns {String}
 */
var getCookie = function (cookie) {
	return unique(cookie.map(function (value) {
		return value.split(';')[0];
	})).join('; ');
};

function auth() {
	var url = 'https://account.survarium.com/ru';

	return got(url, {
			headers: {
				'user-agent': headers['user-agent']
			}
		})
		.then(function (res) {
			var html = cheerio.load(res.body, { decodeEntities: false });
			var form = html('form');
			var data = {
				'LoginForm[email]': config.forum.email,
				'LoginForm[password]': config.forum.pass,
				'_csrf': form.find('input[name="_csrf"]').attr('value')
			};
			var cookie = getCookie(res.headers['set-cookie']);

			return { cookie: cookie, data: data };
		})
		.then(function (params) {
			return new Promise(function (resolve, reject) {
				got
					.stream(url + '/signin', {
						headers: {
							'user-agent': headers['user-agent'],
							cookie: params.cookie
						},
						body: params.data
					})
					.on('error', function (err, body, res) {
						reject(err);
					})
					.on('response', function (res) {
						resolve(getCookie(res.headers['set-cookie']));
					});
			});
		})
		.then(function (cookie) {
			return got('https://forum.survarium.com/ru/', {
					headers: {
						cookie: cookie,
						'user-agent': headers['user-agent']
					}
				})
				.then(function (res) {
					headers.cookie = getCookie(res.headers['set-cookie']);
					debug(`auth ok: "${headers.cookie}"`);
				});
		});
}

function loader () {
	importInProgress = true;
	debug('loading dev messages');

	return auth()
		.then(function () {
			return (new Promise(function (resolve) {
					var _targets = targets.slice();
					var next = function () {
						var target = _targets.shift();

						if (!target) {
							return resolve();
						}

						return loadTarget(target)
							.catch(function (err) {
								console.log(err);
							})
							.then(next);
					};

					next();
				}));
		})
		.then(function () {
			debug('loaded');
			importInProgress = undefined;
			tryToShutdown();
			setTimeout(loader, 1000 * 60 * 10);
		})
		.catch(function (error) {
			console.log(error);
		});
}

process.on('SIGTERM', function () {
	console.log(`register importer ${process.pid} shutdown...`);
	gracefulShutdown = true;

	if (!importInProgress) {
		tryToShutdown();
	}
});

if (config.v1.importer) {
	setTimeout(loader, (Math.random() * 30000) >>> 0);
}

/**
 * DEBUG
 */

loader();

module.exports = {
	loader: loader
};
