const mongoose   = require('mongoose');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const ClanRolesSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		index: { unique: true }
	},

	weight: Number,

	deletedAt : Date
}, { timestamps: true });

module.exports = db.model('ClanRoles', ClanRolesSchema);
