const mongoose = require('mongoose');
const db       = require('../../lib/db');

const Schema = mongoose.Schema;

const scoreMicro = {
	type   : Number,
	default: 0,
	index  : true
};

const StatsSchema = new Schema({
	date: {
		type : Date,
		index: true
	},
	match  : {
		type: Schema.Types.ObjectId,
		ref : 'Matches'
	},
	map    : {
		type: Schema.Types.ObjectId,
		ref : 'Maps'
	},
	battlefield: {
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
    rating_match: {
        type: Boolean,
        index: true
    },
	player : {
		type: Schema.Types.ObjectId,
		ref : 'Players',
		index: true
	},
	clan   : {
		type : Schema.Types.ObjectId,
		ref  : 'Clans',
		index: true
	},
	clanwar: {
		type : Boolean,
		index: true
	},

	team: Number,

	level: scoreMicro,
	elo: Number,

    place  : {
	    type: Number,
        default: 0
    },
	score  : scoreMicro,
	kills  : scoreMicro,
	dies   : scoreMicro,
	kd     : scoreMicro,
	victory: {
		type : Boolean,
		index: true
	},

	headshots    : scoreMicro,
	grenadeKills : scoreMicro,
	meleeKills   : scoreMicro,
	artefactKills: scoreMicro,
	pointCaptures: scoreMicro,
	boxesBringed : scoreMicro,
	artefactUses : scoreMicro,
	pveBoxesBringed : scoreMicro,

	deletedAt: Date
}, {
	collection: 'statistics',
	timestamps: true
});

module.exports = db.model('Stats', StatsSchema);
