const Query = require('../../lib/query');

const supportedListFilters = (function () {
	var filters = {
		'progress.level'     : {
			type: 'number',
			max : 100
		},
		'progress.elo'       : { type: 'number' },
		'total.scoreAvg'     : { type: 'number' },
		'total.kills'        : { type: 'number' },
		'total.dies'         : { type: 'number' },
		'total.kd'           : { type: 'number' },
		'total.victories'    : { type: 'number' },
		'total.matches'      : { type: 'number' },
		'total.winRate'      : { type: 'number' },
		'total.headshots'    : { type: 'number' },
		'total.grenadeKills' : { type: 'number' },
		'total.meleeKills'   : { type: 'number' },
		'total.artefactKills': { type: 'number' },
		'total.artefactUses' : { type: 'number' },
		'total.pointCaptures': { type: 'number' },
		'total.boxesBringed' : { type: 'number' }
	};

	return Query.build(filters);
})();

exports.list = supportedListFilters;
