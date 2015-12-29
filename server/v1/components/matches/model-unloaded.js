const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');

const Schema = mongoose.Schema;

const MatchesUnloadedSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	date: Date,
	deletedAt: Date
});

MatchesUnloadedSchema.plugin(timestamps);

MatchesUnloadedSchema.statics.findOrCreate = function (data) {
	return this.findOne({
			id: data.id
		})
		.lean()
		.then(function (unloaded) {
			if (unloaded) {
				return;
			}
			return this.create(data);
		}.bind(this));
};

module.exports = db.model('MatchesUnloaded', MatchesUnloadedSchema);
