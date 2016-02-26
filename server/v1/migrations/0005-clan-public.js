'use strict';

/**
 * Считает суммарное количество действий клана по имеющейся статистике
 */

var db      = require('../lib/db');
const utils = require('../lib/utils');

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

	let clans      = db.collection('clans');
	let statistics = db.collection('statistics');

	status(true);
	var aggregator = statistics.aggregate([{
		$group: {
			_id          : "$clan",
			score        : { $sum: "$score" },
			matches      : { $sum: 1 },
			victories    : { $sum: { $cond: ["$victory", 1, 0] } },
			kills        : { $sum: "$kills" },
			dies         : { $sum: "$dies" },
			headshots    : { $sum: "$headshots" },
			grenadeKills : { $sum: "$grenadeKills" },
			meleeKills   : { $sum: "$meleeKills" },
			artefactKills: { $sum: "$artefactKills" },
			pointCaptures: { $sum: "$pointCaptures" },
			boxesBringed : { $sum: "$boxesBringed" },
			artefactUses : { $sum: "$artefactUses" }
		}
	}], { cursor: { batchSize: 1 } });

	function row(total) {
		status(true);

		clans.findOne({ _id: total._id }, { stats: 0, matches: 0, players: 0 }, function (err, clan) {
			if (err) {
				status();
				return console.error('clan fetch', err);
			}

			if (!clan) {
				console.warn(`no clan ${total._id} found`);
				status();
				return;
			}

			clan.total = clan.total || { score: 0, victories: 0, matches: 0, kills: 0, dies: 0 };

			clans.update({ _id: clan._id }, {
				$set: {
					'total.scoreAvg': +((clan.total.score || 0) / (clan.total.matches)).toFixed(0),
					'total.winRate' : ((+clan.total.victories || 0) / (+clan.total.matches || 0) * 100) || 0,
					'total.kd'      : +utils.kd(clan.total.kills, clan.total.dies),

					'totalPublic.matches'  : total.matches,
					'totalPublic.victories': total.victories,
					'totalPublic.kills'    : total.kills,
					'totalPublic.dies'     : total.dies,

					'totalPublic.headshots'    : total.headshots,
					'totalPublic.grenadeKills' : total.grenadeKills,
					'totalPublic.meleeKills'   : total.meleeKills,
					'totalPublic.artefactKills': total.artefactKills,
					'totalPublic.pointCaptures': total.pointCaptures,
					'totalPublic.boxesBringed' : total.boxesBringed,
					'totalPublic.artefactUses' : total.artefactUses,

					'totalPublic.score'   : total.score,
					'totalPublic.scoreAvg': +((total.score || 0) / (total.matches)).toFixed(0),
					'totalPublic.winRate' : ((+total.victories || 0) / (+total.matches || 0) * 100) || 0,
					'totalPublic.kd'      : +utils.kd(total.kills, total.dies)
				}
			}, function (err) {
				status();
				if (err) {
					return console.error('clan', err);
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
