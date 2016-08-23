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
    
    const PAGE = 10000;
    var SKIP = 0;

    function waste() {
        status(true);
        
        console.log(`computing next ${PAGE} matches`);
        
        var rows = 0;
        
        var aggregator = matches.aggregate([
            { $skip: SKIP },
            { $limit: PAGE },
            { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: Stats.collection.name, localField: 'stats', foreignField: '_id', as: 'stats' } },
            { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },
            { $project: { _id: 1, duration: 1, 'player': '$stats.player' } },
            { $group: { _id: '$_id', duration: { $last: '$duration' }, players: { $push: '$player' } } }
        ], { cursor: { batchSize: 1 }, allowDiskUse: true });
    
        function row(match) {
            status(true);
            
            let duration = match.duration;
            let list = match.players;
            if (duration && list && list.length) {
                return players.update({ _id: { $in: list } }, { $inc: { wasted: duration } }, { multi: true });
            } else {
                return (new Promise(resolve => resolve()));
            }
        }
    
        aggregator
            .on('data', match => row(match).then(() => status() ))
            .once('end', function () {
                if (rows) {
                    SKIP += PAGE;
                    waste();
                }
                
                status();
            });
    }
    
    status(true);
    players
        .update({}, { $set: { wasted: 0 } }, { multi: true })
        .then((stats) => {
            console.log(`players revert waste ${stats}`);
            
            waste();
            
            status();
            
        })
        .catch(console.error);
});
