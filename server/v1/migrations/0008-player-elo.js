'use strict';

/**
 * Удаляет старые поля общего elo рейтинга игроков
 */

const db = require('../lib/db');

db.once('connected', function () {
	var status = (function () {
		var count = 0;
		var quitter;

		function exit() {
			console.log(`planning exit`);
			quitter = setTimeout(function () {
				db.close();
			}, 10000);
		}

		return function (add) {
			if (add) {
				return ++count;
			}
			if (!--count) {
				return exit();
			}
			clearTimeout(quitter);
			//console.log(`remains ${count} operations`);
		}
	})();

    status(true);

    var players = db.collection('players');

    console.log('Dropping unused fields...');

    players
        .bulkWrite([
            { updateMany: {
                filter: {},
                update: {
                    '$unset': {
                        'progress.elo': true,
                        'progress.rating_match_elo': true,
                        'progress.random_match_elo': true
                    }
                }
            } }
        ])
        .then(() => {
            console.log('Unused fields unset');
            status();

            const INDEXES_TO_DROP = ['progress.elo_1', 'progress.rating_match_elo_1', 'progress.random_match_elo_1'];

            INDEXES_TO_DROP.forEach(index => {
                console.log(`Dropping index ${index}`);

                status(true);

                players.dropIndex(index, (err, result) => {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log(`Index ${index} dropped`, result);
                    }

                    status();
                });
            });
        });
});
