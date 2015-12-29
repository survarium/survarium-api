const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');
const importer = require('./importer');

const Schema = mongoose.Schema;

const scoreMicro = {
	type: Number,
	default: 0,
	index: true
};

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

PlayersSchema.statics.load = function () {
	return importer.load.apply(this, arguments);
};

PlayersSchema.methods.addStat = function (stat) {
	var self = this;
	return this
		.update({
			$push: {
				stats: stat._id
			},
			total: {
				$inc: {
					headshots: stat.headshots,
					grenadeKills: stat.grenadeKills,
					meleeKills: stat.meleeKills,
					artefactKills: stat.artefactKills,
					pointCaptures: stat.pointCaptures,
					boxesBringed: stat.boxesBringed,
					artefactUses: stat.artefactUses
				}
			}
		})
		.exec()
		.then(function () {
			return self;
		});
};

module.exports = db.model('Players', PlayersSchema);
