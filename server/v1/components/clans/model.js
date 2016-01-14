const mongoose   = require('mongoose');
const db         = require('../../lib/db');
const importer   = require('./importer');

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
		artefactUses: scoreMicro
	},
	stats: [
		{
			type: Schema.Types.ObjectId,
			ref : 'Stats'
		}
	],

	level: Number,
	elo: Number,

	deletedAt : Date
}, { timestamps: true });

ClansSchema.statics.load = function () {
	return importer.load.apply(this, arguments);
};

ClansSchema.statics.fetch = importer.fetch;

module.exports = db.model('Clans', ClansSchema);
