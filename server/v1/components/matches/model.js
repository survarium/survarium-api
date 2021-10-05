const mongoose = require('mongoose');
const db = require('../../lib/db');
require('./model-unloaded');

const Schema = mongoose.Schema;
const scoreMicro = {
	type: Number,
	default: 4
};

const MatchesSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	date: {
		type: Date,
		index: true
	},
	duration: Number,
	server: Number,
	replay: String,
	level: {
		type: Number,
		index: true
	},
    rating_match: {
	    type: Boolean,
        index: true
    },
	difficulty: {
		type: Number
	},
	score: [
		Number
	],
	map: {
		type: Schema.Types.ObjectId,
		ref : 'Maps'
	},
	place: {
		type: Schema.Types.ObjectId,
		ref : 'Place'
	},
	mode: {
		type: Schema.Types.ObjectId,
		ref : 'GameMode'
	},
	weather: {
		type: Schema.Types.ObjectId,
		ref : 'Weather'
	},
    map_version: Number,
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
			ref : 'Clans',
			index: true
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
