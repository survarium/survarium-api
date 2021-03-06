const mongoose = require('mongoose');
const db       = require('../../lib/db');

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
		index: true,
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

	total: { // итоги клановых матчей
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
		score: scoreMicro,

		scoreAvg: scoreMicro,
		winRate: scoreMicro,
		kd: scoreMicro
	},

	totalPublic: { // итоги паблик матчей
		matches: scoreMicro, // фактически, это количество статистик, а не матчей
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

		score: { type: Number, default: 0 },
		scoreAvg: scoreMicro,
		winRate: scoreMicro,
		kd: scoreMicro
	},

	stats: [ // статистики паблик матчей
		{
			type: Schema.Types.ObjectId,
			ref : 'Stats'
		}
	],

	matches: [ // статистики клановых матчей
		{
			type: Schema.Types.ObjectId,
			ref : 'Matches'
		}
	],
    
    banned: [{
        type: Schema.Types.ObjectId,
        ref : 'Players'
    }],

	level: scoreMicro,
	elo: scoreMicro,

	foundation: Date,

	deletedAt : Date
}, { timestamps: true });

module.exports = db.model('Clans', ClansSchema);
