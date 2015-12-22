const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');
const config = require('../../../configs');

const Schema = mongoose.Schema;

const langs = config.api.languages.reduce(function (prev, next) {
	prev[next] = {
		title: {
			type: String,
			required: true,
			trim: true
		}
	};
	return prev;
}, {});

const Weather = new Schema({
	langs: langs,
	deletedAt: Date
});

Weather.plugin(timestamps);

module.exports = db.model('Weather', Weather);
