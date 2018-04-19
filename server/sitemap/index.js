'use strict';

var Promise = require('bluebird');
var path = require('path');
var sm = require('sitemap');

var db = require('../v1/lib/db');

const HOST = process.env.HOST || 'https://survarium.pro';
const NAME = process.env.NAME || 'sv-pro-sitemap';
const GZIP = process.env.GZIP === 'true';
const SIZE = +process.env.SIZE || 50000;
const DST  = process.env.DST || path.resolve(__dirname, '../../.sitemaps');

const ALTERNATES = [{
    param: 'ru',
}, {
    param: 'ua',
    locale: 'uk'
}, {
    param: 'en'
}];

function getPages(result) {
	result = result || [];
	[].push.apply(result, [
		{ url: HOST + '/', changefreq: 'always' },
		{ url: HOST + '/info/messages', changefreq: 'always' },
		{ url: HOST + '/info/about', changefreq: 'monthly' },
		{ url: HOST + '/info/bans', changefreq: 'weekly' },
		{ url: HOST + '/streams/youtube', changefreq: 'monthly' },
		{ url: HOST + '/streams/twitch', changefreq: 'monthly' },
		{ url: HOST + '/players/list', changefreq: 'monthly' },
		{ url: HOST + '/players/search', changefreq: 'monthly' },
		{ url: HOST + '/matches/list', changefreq: 'always' },
		{ url: HOST + '/matches/clanwars', changefreq: 'monthly' },
		{ url: HOST + '/matches/search', changefreq: 'monthly' },
		{ url: HOST + '/clans/list', changefreq: 'monthly' },
		{ url: HOST + '/clans/search', changefreq: 'monthly' },
		{ url: HOST + '/armory', changefreq: 'monthly' },
		{ url: HOST + '/pve/dangerous-knowledge', changefreq: 'monthly' }
	]);
	return new Promise(resolve => resolve(result));
}

function getClans(result) {
    result = result || [];
    return new Promise((resolve, reject) => {
        var changefreq = 'weekly';
        var url = HOST + '/clans/';

        var aggregator = db.collection('clans').aggregate([
            { $project: { path: '$abbr', _id: 0 } }
        ], { cursor: { batchSize: 1 } });

        aggregator
        .on('data', function clansElem (elem) {
            result.push({ url: url + encodeURIComponent(elem.path), changefreq: changefreq });
        })
        .once('end', function () {
            resolve(result);
        })
        .once('error', reject);
    });
}

function getMessages(result) {
    result = result || [];
    return new Promise((resolve, reject) => {
        var changefreq = 'never';
        var url = HOST + '/info/messages/';

        var aggregator = db.collection('vg_messages').aggregate([
            { $project: { _id: 1 } }
        ], { cursor: { batchSize: 1 } });

        aggregator
        .on('data', function clansElem (elem) {
            result.push({ url: url + encodeURIComponent(elem._id), changefreq: changefreq });
        })
        .once('end', function () {
            resolve(result);
        })
        .once('error', reject);
    });
}

function getMatches(result) {
	result = result || [];
	return new Promise((resolve, reject) => {
		var changefreq = 'never';
		var url = HOST + '/matches/';

		var aggregator = db.collection('matches').aggregate([
			{ $project: { path: '$id', _id: 0 } }
		], { cursor: { batchSize: 1 } });

		aggregator
			.on('data', function matchesElem (elem) {
				result.push({ url: url + elem.path, changefreq: changefreq });
			})
			.once('end', function () {
				resolve(result);
			})
			.once('error', reject);
	});
}

function getPlayers(result) {
	result = result || [];
	return new Promise((resolve, reject) => {
		var changefreq = 'weekly';
		var url = HOST + '/players/';

		var aggregator = db.collection('players').aggregate([
			{ $project: { path: '$nickname', _id: 0 } }
		], { cursor: { batchSize: 1 } });

        var filter = /\//;

		aggregator
			.on('data', function playersElem (elem) {
			    if (filter.test(elem.path)) {
                    // ///ZVER///
                    // ///FlashСаня///
			        return;
                }

				result.push({ url: url + encodeURIComponent(elem.path), changefreq: changefreq });
			})
			.once('end', function () {
				resolve(result);
			})
			.once('error', reject);
	});
}

function getArmory(result) {
	result = result || [];
	return new Promise((resolve, reject) => {
		var changefreq = 'monthly';
		var url = HOST + '/armory/';

		var aggregator = db.collection('game_items').aggregate([
			{ $project: { path: '$name', _id: 0 } }
		], { cursor: { batchSize: 1 } });

		aggregator
			.on('data', function armoryElem (elem) {
				result.push({ url: url + encodeURIComponent(elem.path), changefreq: changefreq });
			})
			.once('end', function () {
				resolve(result);
			})
			.once('error', reject);
	});
}

function addAlternates(result) {
	return result.map(elem => {
		elem.links = ALTERNATES.map(lang => {
			return {
				lang: lang.locale || lang.param,
				url: `${elem.url}?lang=${lang.param}`
			};
		});
		return elem;
	});
}

db.once('connected', () => {
	var result = [];

	return Promise
		.all([
			getPages(result),
		    getClans(result),
		    getPlayers(result),
			getMatches(result),
            getArmory(result),
            getMessages(result)
		])
		//.then(() => result = addAlternates(result)) // Yandex robot errors
		.then(() => {
			return new Promise((resolve, reject) => {
				new sm.createSitemapIndex({
					cacheTime: 600000,
					hostname: HOST,
					sitemapName: NAME,
					gzip: GZIP,
					sitemapSize: SIZE,
					targetFolder: DST,
					urls: result,
					callback: (err, result) => {
						if (err) {
							return reject(err);
						}

						resolve(result);
					}
				});
			});
		})
		.then(() => {
		    console.log('sitemap generated');
			db.close();
		});
});
