'use strict';

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


	let statistics = db.collection('statistics');
	let matches = db.collection('matches');

	matches
		.find({}, { _id: 1 })
		.on('error', function (err) {
			if (err) {
				return console.error('matches', err);
			}
		})
		.on('data', function (data) {
			status(true);
			statistics
				.find({ match: data._id }, { _id: 1 })
				.map(function (stat) {
					return stat._id;
				})
				.toArray(function (err, stats) {
					if (err) {
						status();
						return console.error('stats', err);
					}
					matches.update({ _id: data._id }, { $set: { stats: stats } }, function (err) {
						status();
						if (err) {
							return console.error('stats', err);
						}
					});
				})
		});
});
