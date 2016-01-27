const mongoose = require('mongoose');
const db = require('../../lib/db');
require('./model-unloaded');

const Schema = mongoose.Schema;
const scoreMicro = {
	type: Number,
	default: 0
};

const MatchesSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	date: Date,
	duration: Number,
	server: Number,
	replay: String,
	level: {
		type: Number,
		index: true
	},
	score: [
		Number
	],
	map: {
		type: Schema.Types.ObjectId,
		ref : 'Maps'
	},
	stats: [
		{
			type: Schema.Types.ObjectId,
			ref : 'Stats'
		}
	],
	clanwar: {
		type: Boolean,
		index: true,
		default: false
	},
	clans: [{
		clan: {
			type: Schema.Types.ObjectId,
			ref : 'Clans'
		},
		win : Boolean,
		total: {
			score  : scoreMicro,
			kills  : scoreMicro,
			dies   : scoreMicro,
			headshots    : scoreMicro,
			grenadeKills : scoreMicro,
			meleeKills   : scoreMicro,
			artefactKills: scoreMicro,
			pointCaptures: scoreMicro,
			boxesBringed : scoreMicro,
			artefactUses : scoreMicro
		}
	}],
	deletedAt: Date
}, { timestamps: true });

module.exports = db.model('Matches', MatchesSchema);
