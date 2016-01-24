'use strict';

var db      = require('../lib/db');
var Promise = require('bluebird');

var clansImporter = require('../components/clans/importer');
var Clans         = db.model('Clans');
var Matches       = require('../components/matches/model');
var Stats         = require('../components/stats/model');
var Players       = require('../components/players/model');

//return require('../components/matches/importer').importMatch(3839396); // new, proper
//return matchImporter.importMatch(3838524);
//return require('../components/matches/importer').importMatch(3722078);

/**
 * Конвертирует матчи в клановые
 */

db.once('connected', function () {
	var status = (function () {
		var count = 0;
		var quitter;

		function exit() {
			console.log(`planning exit`);
			quitter = setTimeout(function () {
				db.close();
			}, 1000);
		}

		return function (add) {
			if (add) {
				return ++count;
			}
			if (!--count) {
				return exit();
			}
			clearTimeout(quitter);
			console.log(`remains ${count} operations`);
		}
	})();

	status(true);
	Promise.props({
		clans: Clans.update({}, {
			$unset: { total: '' }
		}, { multi: true })
	}).then(function () {
		status();
	});

	return;

	var aggr = Stats.aggregate([
		{ $match: { clan: { $exists: 1 } } },
		{ $group: { _id: { clan: '$clan', match: '$match' }, stats: { $push: '$_id' } } }
	]).allowDiskUse(true).cursor({ batchSize: 100 });
	process.nextTick(function () {
		status(true);
		aggr.exec().each(function (err, doc) {
			if (err) {
				return console.error(`aggregator error`, err);
			}
			if (!doc) {
				return console.log('aggregation finished');
			}
			if (!doc._id.clan) {
				return;
			}
		});
	});
});
