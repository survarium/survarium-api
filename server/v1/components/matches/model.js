const mongoose = require('mongoose');
const db = require('../../lib/db');
require('./model-unloaded');

const Schema = mongoose.Schema;

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
		is: {
			type: Boolean,
			index: true,
			default: false
		},
		clans: [{
			clan: {
				type: Schema.Types.ObjectId,
				ref : 'Clans'
			},
			win : Boolean
		}]
	},
	deletedAt: Date
}, { timestamps: true });

module.exports = db.model('Matches', MatchesSchema);
