const mongoose   = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const scoreMicro = {
	type: Number,
	default: 0
};

const StatsSchema = new Schema({
	date: {
		type : Date,
		index: true
	},

	match : {
		type: Schema.Types.ObjectId,
		ref : 'Matches'
	},
	map: {
		type: Schema.Types.ObjectId,
		ref : 'Maps'
	},
	player: {
		type: Schema.Types.ObjectId,
		ref : 'Players'
	},
	clan: {
		type: Schema.Types.ObjectId,
		ref : 'Clans'
	},

	team: Number,

	level: scoreMicro,

	score  : scoreMicro,
	kills  : scoreMicro,
	dies   : scoreMicro,
	victory: Boolean,

	headshots    : scoreMicro,
	grenadeKills : scoreMicro,
	meleeKills   : scoreMicro,
	artefactKills: scoreMicro,
	pointCaptures: scoreMicro,
	boxesBringed : scoreMicro,
	artefactUses : scoreMicro,

	ammunition: [{
		slot: {
			type: Schema.Types.ObjectId,
			ref : 'Slots'
		},
		item: {
			type: Schema.Types.ObjectId,
			ref : 'Items'
		},
		amount: Number
	}],
	deletedAt : Date
}, { collection: 'statistics' });

StatsSchema.plugin(timestamps);

module.exports = db.model('Stats', StatsSchema);
