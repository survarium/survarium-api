'use strict';

const Promise = require('bluebird');
const mongoose = require('mongoose');
const db = require('../../lib/db');
const cache = require('../../lib/cache');
const importer = require('./importer');
const ClansImporter = require('../clans/importer');

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
		text: true,
		required: true,
		trim: true
	},
	nicknames: [
		{
			until: {
				type: Date,
				default: Date.now
			},
			nickname: String
		}
	],
	clan: {
		type: Schema.Types.ObjectId,
		ref : 'Clans',
		index: true
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
		level: Number,
		experience: {
			type: Number,
			index: true
		},
		'elo-random': {
			type: Number,
			index: true
		},
		'elo-rating': {
			type: Number,
			index: true
		}
	},
	total: {
		matches: scoreMicro,
		victories: scoreMicro,
		kills: scoreMicro,
		dies: scoreMicro,
		kd: scoreMicro,
		winRate: scoreMicro,
		stats: { type: Number, default: 0 },
		score: { type: Number, default: 0 },
		scoreAvg: scoreMicro,

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
	ammunition: [new Schema({
		profile: Number,
		active: Boolean,
		items: [new Schema({
			slot: Number,
			item: { type: Number, index: true },
			amount: Number,
			mods: [{ type: Number, index: true }]
		}, { _id: false })]
	}, { _id: false })],
	skills: [new Schema({
		id: {
			type: Number,
			index: true
		},
		points: Number
	}, { _id: false })],
	banned: {
		type: Boolean,
		index: true
	},
	ban: {
		type: Schema.Types.ObjectId,
		ref: 'Bans'
	},
    wasted: {
	    type: Number,
        index: true
    },
	deletedAt: Date
}, { timestamps: true });

PlayersSchema.statics.load = function () {
	return importer.load.apply(this, arguments);
};

PlayersSchema.methods.addStat = function (stat, matchData) {
	var self = this;
	var updaters = [this.update({
		$push: {
			stats: stat._id
		},
		$inc: {
			'total.headshots': stat.headshots || 0,
			'total.grenadeKills': stat.grenadeKills || 0,
			'total.meleeKills': stat.meleeKills || 0,
			'total.artefactKills': stat.artefactKills || 0,
			'total.pointCaptures': stat.pointCaptures || 0,
			'total.boxesBringed': stat.boxesBringed || 0,
			'total.artefactUses': stat.artefactUses || 0,
			'total.stats': 1,
			'total.score': stat.score || 0,
            'wasted': matchData.game_duration || 0
		},
		$set: {
			'total.scoreAvg': +((this.total.score + stat.score || 0) / (this.total.stats + 1)).toFixed(0)
		}
	}).exec()];
	if (stat.clan) {
		updaters.push(ClansImporter.publicStat(stat.clan, stat));
	}
	return Promise
		.all(updaters)
		.then(function () {
			return self;
		});
};

PlayersSchema.methods.attachClan = function (clan) {
	return this
		.update({
			clan: clan._id,
			clan_meta: {
				id: clan.id,
				abbr: clan.abbr
			}
		})
		.exec();
};

PlayersSchema.methods.detachClan = function () {
	return this
		.update({
			$unset: {
				clan: '',
				clan_meta: ''
			}
		})
		.exec();
};

PlayersSchema.statics.activeCount = function () {
	const cacheKey = `player:activeCount`;
	return cache
		.get(cacheKey)
		.then(count => {
			if (count !== null) {
				return Number(count);
			}

			return this
				//.find({ banned: { $exists: false } })
				.count()
				.then(count => {
					cache.set(cacheKey, count, 'EX', 60 * 30);
					return count;
				});
		});
};



module.exports = db.model('Players', PlayersSchema);
