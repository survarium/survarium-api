'use strict';

/**
 * Считает среднее количество очков и побед
 */

var db = require('../lib/db');

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

	let players    = db.collection('players');
	let statistics = db.collection('statistics');

	status(true);
	var aggregator = statistics.aggregate([{
		$group: {
			_id          : "$player",
			score : { $sum: "$score" },
			stats: { $sum: 1 }
		}
	}], { cursor: { batchSize: 1 } });

	function row(total) {
			status(true);
			players
				.findOne({ _id: total._id }, function (err, player) {
					if (err) {
						status();
						return console.error('player', err);
					}
					players.update({ _id: total._id }, {
						$set: {
							'total.stats'    : total.stats,
							'total.score' : total.score,
							'total.scoreAvg'   : +(total.score / total.stats).toFixed(0),
							'total.winRate': ((+player.total.victories || 0) / (+player.total.matches || 0) * 100) || 0
						}
					}, function (err) {
						status();
						if (err) {
							return console.error('player', err);
						}
					});
				});
	}

	aggregator
		.on('data', row)
		.once('end', function () {
			status();
		});
});
