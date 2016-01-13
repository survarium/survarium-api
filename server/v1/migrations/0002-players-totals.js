'use strict';

/**
 * Считает суммарное количество действий игрока по имеющейся статистике
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
			artefactUses : { $sum: "$artefactUses" },
			boxesBringed : { $sum: "$boxesBringed" },
			pointCaptures: { $sum: "$pointCaptures" },
			artefactKills: { $sum: "$artefactKills" },
			meleeKills   : { $sum: "$meleeKills" },
			grenadeKills : { $sum: "$grenadeKills" },
			headshots    : { $sum: "$headshots" }
		}
	}], { cursor: { batchSize: 1 } });

	function row(total) {
			status(true);
			players.update({ _id: total._id }, {
				$set: {
					'total.headshots'    : total.headshots,
					'total.grenadeKills' : total.grenadeKills,
					'total.meleeKills'   : total.meleeKills,
					'total.artefactKills': total.artefactKills,
					'total.pointCaptures': total.pointCaptures,
					'total.boxesBringed' : total.boxesBringed,
					'total.artefactUses' : total.artefactUses
				}
			}, function (err) {
				status();
				if (err) {
					return console.error('player', err);
				}
			});
	}

	aggregator
		.on('data', row)
		.once('end', function () {
			status();
		});
});
