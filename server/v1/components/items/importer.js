'use strict';

const Promise = require('bluebird');
const apiNative = require('../../lib/api-native');
const cache = require('../../lib/cache');
const db = require('../../lib/db');
const config = require('../../../configs');
const Items = db.model('Items');

const languages = config.api.languages;

const CACHEKEY = 'items:loaddict:';
const EXPIRE = 60 * 60 * 24;
const logKey = 'itemDict:';

function saveDict(lang, data) {
	return new Promise(function (resolve, reject) {
		if (!lang || !data) {
			return reject(logKey + ' empty save params');
		}
		var dict = data.dictionary;
		var promises = Object.keys(dict).map(function (key) {
			var item = dict[key];
			var id = Number(key);
			var data = { };
			data[lang] = {
				name: item
			};
			return Items.findOne({ id: id }).exec()
				.then(function (item) {
					if (!item) {
						return Items.create({
							id: id,
							lang: data
						});
					}
					return item.set(`lang.${lang}`, data[lang]).save();
				})
				.catch(console.error.bind(console, logKey));
		});
		var promise = Promise.all(promises);
		resolve(promise);
	});
}

function loadDict(lang, i) {
	setTimeout(function () {
		const cachekey = CACHEKEY + lang;
		return cache
			.get(cachekey)
			.then(function (loading) {
				if (loading) {
					return;
				}
				return cache.set(cachekey, true, 'EX', EXPIRE)
					.then(function () {
						return apiNative.getItemsDict({ language: lang })
							.then(saveDict.bind(null, lang))
							.then(function () {
								console.info(logKey, 'loaded', lang);
							})
							.catch(function (err) {
								console.error(logKey, 'cannot load', lang, err);
								setTimeout(loadDict.bind(loadDict, lang), 1000 * 60 * 5);
								return cache.del(cachekey);
							});
					})
					.catch(console.error.bind(console, logKey, 'cannot set cache status'));
			})
			.catch(console.error.bind(console, logKey, 'cannot get cache status'));
	}, i * 500);
}

const loadAllForms = function () {
	languages.forEach(loadDict);
};

if (process.env.IMPORTER) {
	setInterval(loadAllForms, EXPIRE * 1000);
	setTimeout(loadAllForms, (Math.random() * 10000) >>> 0);
}

function deblock() {
	return cache.multi().del(CACHEKEY + languages[0]).del(CACHEKEY + languages[1]).exec().then(function () {
		console.info(logKey, 'cache cleaned');
	});
}

if (process.env.DEBLOCK) {
	deblock();
}

module.exports = {
	deblock: deblock
};
