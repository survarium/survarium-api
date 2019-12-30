'use strict';

/**
 * Удаляет старый никнеймы
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
		}
	})();

    status(true);

    var players = db.collection('players');

    console.log('Dropping aliases...');

    players
        .update(
            { id: 18436435757559477704 },
            { $unset: { nicknames: 1 }},
            function receiver(err) {
                status();

                if (err) {
                    return console.error('update error', err);
                }

                console.log('ok');
            }
        );
});
