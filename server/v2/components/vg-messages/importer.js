'use strict';

const debug = require('debug')('importer:matches');
const Promise = require('bluebird');
const db = require('../../../v1/lib/db');
const utils = require('../../../v1/lib/utils');
const config = require('../../../configs');
const notifications = require('../../../v1/services/telegram/triggers');
const got = require('got');
const cheerio = require('cheerio');
//const VgMessages = require('./model');
const EXPIRE = 60 * 1;
const logKey = 'vg-message:';

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

const LANGS = [
	{
		lang: 'ru',
		url: 'https://forum.survarium.com/ru/dev_tracker.php',
		POST: '.search.post',
		POST_URL: '.searchresults a',
		INFO: '.postprofile',
		AUTHOR: '.author a',
		TOPICS: 'dd + dd a',
		DATE: '.postbody .author',
		DATEPARSE: function (value) {
			//28.02.2016, 18:20
			let match = value.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/);
			return new Date(Date.UTC(match[3], Number(match[2] - 1), match[1], match[4], match[5]));
		}
	},
	{
		lang: 'en',
		url: 'https://forum.survarium.com/en/dev_tracker.php',
		POST: '.search.post',
		POST_URL: '.searchresults a',
		INFO: '.postprofile',
		AUTHOR: '.author a',
		TOPICS: 'dd + dd a',
		DATE: '.postbody .author',
		DATEPARSE: function (value) {
			//28.02.2016, 18:20
			let match = value.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/);
			return new Date(Date.UTC(match[3], Number(match[2] - 1), match[1], match[4], match[5]));
		}
	},
	{
		lang: 'pl',
		url: 'https://forum.survarium.com/pl/dev_tracker.php',
		POST: '.search.post',
		POST_URL: '.searchresults a',
		INFO: '.postprofile',
		AUTHOR: '.author a',
		TOPICS: 'dd + dd a',
		DATE: '.postbody .author',
		DATEPARSE: function (value) {
			//07 października 2015, 15:24
			let match = value.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2})$/);
			return new Date(Date.UTC(match[3], Number(match[2] - 1), match[1], match[4], match[5]));
		}
	}
];

function parser(html, CONFIG) {
	let lang = CONFIG.lang;
	let $ = cheerio.load(html, { decodeEntities: false });
	let forumURLrel;
	let posts = $(CONFIG.POST);
	posts.each(function (i, post) {
		let $post = $(post);
		let postURL = $post.find(CONFIG.POST_URL).attr('href');

		if (!forumURLrel) {
			forumURLrel = postURL.match(/^([^?]*)/)[1]
		}

		let message = {
			//forum : { id: Number(postURL.match(/f\=(\d+)/)[1]) },
			//topic : { id: Number(postURL.match(/t\=(\d+)/)[1]) },
			//post  : { id: Number(postURL.match(/p\=(\d+)/)[1]) },
			//date  : undefined,
			//text  : undefined,
			author: { id: undefined, name: undefined }
		};

		let info = $post.find(CONFIG.INFO);
		let author = info.find(CONFIG.AUTHOR);
		let topics = info.find(CONFIG.TOPICS);
		let date = $post.find(CONFIG.DATE);

		//message.forum.name = $(topics[0]).text();
		//message.topic.name = $(topics[1]).text();

		message.author.id   = author.attr('href').match(/u\=(\d+)/)[1];
		message.author.name = author.text();

		//message.text = $post.find(`#message_${message.post.id}`).html();

		//message.date = CONFIG.DATEPARSE(date.text());

		console.log(lang, message)
	});
}

function loader () {
	importInProgress = true;
	Promise.all(LANGS.map(function (CONFIG) {
		return got(CONFIG.url)
			.then(function (response) {
				parser(response.body, CONFIG);
			})
			.catch(function (err) {
				console.error(err);
			});
	}))
	.then(function () {
		importInProgress = undefined;
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
