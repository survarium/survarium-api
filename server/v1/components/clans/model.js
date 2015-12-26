const mongoose   = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const ClansSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	abbr: {
		type: String,
		required: true,
		index: true,
		trim: true
	},
	players: [{
		player: {
			type: Schema.Types.ObjectId,
			ref : 'Players'
		},
		role: {
			type: Schema.Types.ObjectId,
			ref : 'ClanRoles'
		}
	}],

	commander: {
		type: Schema.Types.ObjectId,
		ref : 'Players'
	},

	level: Number,
	elo: Number,

	deletedAt : Date
});

ClansSchema.plugin(timestamps);

module.exports = db.model('Clans', ClansSchema);
