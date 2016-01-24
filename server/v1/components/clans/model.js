const mongoose   = require('mongoose');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const scoreMicro = {
	type: Number,
	default: 0,
	index: true
};

const ClansSchema = new Schema({
	id: {
		type: Number,
		required: true,
		index: { unique: true }
	},
	name: {
		type: String,
		required: true,
		trim: true
	},
	abbr: {
		type: String,
		required: true,
		index: { unique: true },
		text: true,
		trim: true
	},
	players: [{
		player: {
			type: Schema.Types.ObjectId,
			ref : 'Players'
		},
		role: {
			type: String,
			index: true
		}/*{
			type: Schema.Types.ObjectId,
			ref : 'ClanRoles'
		}*/
	}],

	/*commander: {
		type: Schema.Types.ObjectId,
		ref : 'Players'
	},*/

	total: {
		matches: scoreMicro,
		victories: scoreMicro,
		kills: scoreMicro,
		dies: scoreMicro,

		headshots: scoreMicro,
		grenadeKills: scoreMicro,
		meleeKills: scoreMicro,
		artefactKills: scoreMicro,
		pointCaptures: scoreMicro,
		boxesBringed: scoreMicro,
		artefactUses: scoreMicro,
		score: scoreMicro
	},
	stats: [
		{
			type: Schema.Types.ObjectId,
			ref : 'Stats'
		}
	],

	matches: [
		{
			type: Schema.Types.ObjectId,
			ref : 'Matches'
		}
	],

	level: Number,
	elo: Number,

	foundation: Date,

	deletedAt : Date
}, { timestamps: true });

module.exports = db.model('Clans', ClansSchema);
