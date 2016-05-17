'use strict';

const debug      = require('debug')('importer:vg-messages');
const Promise    = require('bluebird');
const db         = require('../../../v1/lib/db');
const utils      = require('../../../v1/lib/utils');
const config     = require('../../../configs');
const developers = config.v2.developers;
const telegram   = require('../../../v1/services/telegram/triggers');
const discord    = require('../../services/discord/devmessage');
const got        = require('got');
const cheerio    = require('cheerio');
const VgMessages = require('./model');

var headers = {
	'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4',
	cookie: 'lang=ru'
};

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

	search = null;
	$message = null;

	if (!message.text) {
		debug(`parseMessage:noText "${html}"`);
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
		.then(MAXPOST => {
			MAXPOST && debug(`last ${options.dev.name} message is #${MAXPOST}`);

			let search = cheerio.load(html, { decodeEntities: false });

			let searchError = search('#message p').text();
			if (searchError) {
				if (searchError.match(/(Подходящих\sтем\sили\sсообщений\sне\sнайдено|No\ssuitable\smatches\swere\sfound)/)) {
					return;
				} else {
					throw new Error(searchError);
				}
			}

			let posts  = search('.search.post');
			let messages = [];

			posts.each(function parseSearchPost(i, post) {
				let $post = search(post);

				let postURL = $post.find('.searchresults a').attr('href');

				let postId = Number(postURL.match(/p\=(\d+)/)[1]);

				if (MAXPOST && postId <= MAXPOST) {
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

				var url = message.url = `${options.target.topic.url}?f=${message.forum.id}&t=${message.topic.id}&p=${message.post}#p${message.post}`;

				let info   = $post.find('.postprofile');
				let topics = info.find('dd + dd a');
				let date   = $post.find('.postprofile .author ~ dd:first-of-type');

				message.forum.name = search(topics[0]).text();
				message.topic.name = search(topics[1]).text();

				message.date = parseDate(date.text());

				/**
				 * Планируем загрузку полного тела сообщения
				 */
				messages.push(message);
			});

			return messages.reverse();
		});
}

function loadMessage(message, options) {
	debug(`loading ${options.dev.name} message #${message.post} in ${options.target.lang} forum`);
	return got(message.url, {
			headers: headers
		})
		.then(function (response) {
			return parseMessage(response.body, { target: options.target, dev: options.dev, message: message })
				.then(function (message) {
					telegram.devmessage({ message: message, dev: options.dev, url: message.url });
					discord .devmessage({ message: message, dev: options.dev, url: message.url });
					return message;
				});
		});
}

function loadMessages(messages, params) {
	if (!messages) {
		return debug(`${params.dev.name} has no messages in ${params.target.lang} forum`);
	}
	if (!messages.length) {
		return debug(`${params.dev.name} has no new messages in ${params.target.lang} forum`);
	}
	return new Promise(function (resolve) {
		var next = function () {
			var message = messages.shift();
			if (!message) {
				return resolve();
			}
			return Promise
				.delay(params.target.delay)
				.then(() => loadMessage(message, params))
				.catch(debug)
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
					.then(response => {
						return parseSearch(response.body, { target: target, dev: dev });
					})
					.then(messages => {
						return loadMessages(messages, { target: target, dev: dev });
					})
					.then(() => {
						debug(`${dev.name} messages in ${target.lang} forum loaded`);
						done++;
					})
					.catch(debug)
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
		.then(res => {
			debug(`auth:gotLoginForm`);
			var html = cheerio.load(res.body, { decodeEntities: false });
			var form = html('form');
			var data = {
				'LoginForm[email]': config.forum.email,
				'LoginForm[password]': config.forum.pass,
				'_csrf': form.find('input[name="_csrf"]').attr('value')
			};
			var cookie = getCookie(res.headers['set-cookie']);

			html = null;
			form = null;

			return { cookie: cookie, data: data };
		})
		.then(function (params) {
			return new Promise((resolve, reject) => {
				debug(`auth:authentification`);
				var signin = got
					.stream(url + '/signin', {
						headers: {
							'user-agent': headers['user-agent'],
							cookie: params.cookie
						},
						body: params.data
					})
					.on('error', (err, body, res) => {
						debug(`auth error`, body);
						reject(err);
					})
					.on('response', res => {
						signin.end();
						resolve(getCookie(res.headers['set-cookie']));
					})
					.on('finish', () => signin = null);
			});
		})
		.then(cookie => {
			debug(`auth:getPhpBBCookies`);
			return got('https://forum.survarium.com/ru/', {
					headers: {
						cookie: cookie,
						'user-agent': headers['user-agent']
					}
				})
				.then(res => {
					headers.cookie = getCookie(res.headers['set-cookie']);
					debug(`auth:ok`);
				});
		});
}

function loader () {
	debug('loading dev messages');

	function load() {
		return (new Promise(resolve => {
			var _targets = targets.slice();
			var next = () => {
				var target = _targets.shift();

				if (!target) {
					debug('loader:loaded');
					return resolve();
				}

				return loadTarget(target)
					.catch(err => debug(`loadTarget:error:${err}`))
					.then(next);
			};

			next();
		}));
	}

	return auth()
		.then(load)
		.catch(err => debug(`loader:critical:${err}`))
		.then(() => {
			setTimeout(loader, 1000 * 60 * 5);
		});
}

loader();
//setTimeout(loader, (Math.random() * 30000) >>> 0);

module.exports = {
	loader: loader
};
