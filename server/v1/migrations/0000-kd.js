'use strict';

var db = require('../lib/db');
var utils = require('../lib/utils');

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

	var collections = [
		{
			name: 'players',
			projection: { 'total.kills': 1, 'total.dies': 1 },
			kd: function (collection, elem, cb) {
				collection
					.update(
						{ _id: elem._id },
						{ $set: { 'total.kd': +utils.kd(elem.total.kills || 0, elem.total.dies || 0) } },
						cb
					);
			}
		},
		{
			name: 'statistics',
			projection: { kills: 1, dies: 1 },
			kd: function (collection, elem, cb) {
				collection
					.update(
						{ _id: elem._id },
						{ $set: { kd: +utils.kd(elem.kills || 0, elem.dies || 0) } },
						cb
					);
			}
		}
	];
	function receiver(err) {
		status();
		if (err) {
			return console.error('update error', err);
		}
	}

	collections.forEach(function (colInfo) {
		let collection = db.collection(colInfo.name);
		collection
			.find({}, colInfo.projection)
			.on('error', function (err) {
				if (err) {
					return console.error(colInfo.name, err);
				}
			})
			.on('data', function (data) {
				status(true);
				colInfo.kd(collection, data, receiver);
			});
	});
});
