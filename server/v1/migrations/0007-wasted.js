'use strict';

/**
 * Вычисляет время, проведенное игроком в матчах
 */

const db    = require('../lib/db');
const Stats = require('../components/stats/model');

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

	let matches = db.collection('matches');
	let players = db.collection('players');

	status(true);
    
	var aggregator = matches.aggregate([
        { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
	    { $lookup: { from: Stats.collection.name, localField: 'stats', foreignField: '_id', as: 'stats' } },
        { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, duration: 1, 'player': '$stats.player' } },
        { $group: { _id: '$_id', duration: { $last: '$duration' }, players: { $push: '$player' } } }
    ], { cursor: { batchSize: 1 } });

	function row(match) {
		status(true);
        let duration = match.duration;
        let list = match.players;
        if (duration && list && list.length) {
            players.update({ _id: { $in: list } }, { $inc: { wasted: duration } }, { multi: true }).then(() => status()).catch(err => { console.error(err); status(); });
        } else {
            status();
        }
	}

	aggregator
		.on('data', row)
		.once('end', function () {
			status();
		});
});
