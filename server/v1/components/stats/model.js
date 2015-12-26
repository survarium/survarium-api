const mongoose   = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const StatsSchema = new Schema({
	date: {
		type : Date,
		index: true
	},

	match : {
		type: Schema.Types.ObjectId,
		ref : 'Matches'
	},
	player: {
		type: Schema.Types.ObjectId,
		ref : 'Players'
	},

	level: Number,

	score  : Number,
	kills  : Number,
	dies   : Number,
	victory: Boolean,

	headshots    : Number,
	grenadeKills : Number,
	meleeKills   : Number,
	artefactKills: Number,
	pointCaptures: Number,
	boxesBringed : Number,
	artefactUses : Number,

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
});

StatsSchema.plugin(timestamps);

module.exports = db.model('Stats', StatsSchema);
