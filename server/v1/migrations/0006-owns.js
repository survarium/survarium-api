'use strict';

/**
 * Вычисляет владение аммуницией
 */

const db    = require('../lib/db');
const utils = require('../lib/utils');
const Items = require('../../v2/components/game/importer/items').assignAmmunitionUsage;

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

	let players = db.collection('players');

	status(true);
	var aggregator = players.aggregate([{
		$project: {
			_id: 1,
            ammunition: 1,
            nickname: 1
		}
	}], { cursor: { batchSize: 1 } });

	function row(player) {
		status(true);
        
        Items(player).then(() => status).catch(err => { console.error(err); status(); });
	}

	aggregator
		.on('data', row)
		.once('end', function () {
			status();
		});
});
