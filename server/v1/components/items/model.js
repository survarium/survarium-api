const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');
const config = require('../../../configs');

const Schema = mongoose.Schema;

const langs = config.api.languages.reduce(function (prev, next) {
	prev[next] = {
		name: {
			type: String,
			trim: true
		}
	};
	return prev;
}, {});

const ItemsSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	lang: langs,
	deletedAt: Date
});

ItemsSchema.plugin(timestamps);

module.exports = db.model('Items', ItemsSchema);
