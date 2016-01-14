const mongoose = require('mongoose');
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
}, { timestamps: true });

module.exports = db.model('Weather', Weather);
