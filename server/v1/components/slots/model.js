const mongoose = require('mongoose');
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

const SlotsSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	lang: langs,
	deletedAt: Date
}, { timestamps: true });

module.exports = db.model('Slots', SlotsSchema);
