const mongoose   = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db         = require('../../lib/db');

const Schema = mongoose.Schema;

const ClanRolesSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		index: true
	},

	deletedAt : Date
});

ClanRolesSchema.plugin(timestamps);

module.exports = db.model('ClanRoles', ClanRolesSchema);
