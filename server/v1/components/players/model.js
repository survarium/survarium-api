const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');

const Schema = mongoose.Schema;

const PlayersSchema = new Schema({
	id: {
		type    : String,
		index   : { unique: true },
		required: true,
		trim: true
	},
	nickname: {
		type: 'String',
		index: { unique: true },
		required: true,
		trim: true
	},
	clan: {
		type: Schema.Types.ObjectId,
		ref : 'Clans'
	},
	clan_meta: {
		id: {
			type: Number,
			index: true
		},
		abbr: {
			type: String,
			index: true
		}
	},
	progress: {
		elo: {
			type: Number,
			index: true
		},
		level: Number,
		experience: {
			type: Number,
			index: true
		}
	},
	total: {
		matches: Number,
		victories: Number,
		kills: Number,
		dies: Number,

		headshots: Number,
		grenadeKills: Number,
		meleeKills: Number,
		artefactKills: Number,
		pointCaptures: Number,
		boxesBringed: Number,
		artefactUses: Number
	},
	stats: [
		{
			type: Schema.Types.ObjectId,
			ref : 'Stats'
		}
	],
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
	deletedAt: Date
});

PlayersSchema.plugin(timestamps);

module.exports = db.model('Players', PlayersSchema);
