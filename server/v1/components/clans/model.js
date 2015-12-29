const mongoose   = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db         = require('../../lib/db');
const importer   = require('./importer');

const Schema = mongoose.Schema;

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

	level: Number,
	elo: Number,

	deletedAt : Date
});

ClansSchema.plugin(timestamps);

ClansSchema.statics.load = function () {
	return importer.load.apply(this, arguments);
};

ClansSchema.methods.assignRole = function () {
	return importer.assignRole.apply(this, arguments);
};

module.exports = db.model('Clans', ClansSchema);
