const mongoose = require('mongoose');
const config   = require('../../../../configs');
const db = require('../../../../v1/lib/db');

const Schema = mongoose.Schema;

const langs = config.game.langs.reduce(function (prev, next) {
	prev[config.shortLangs[next]] = {
		name: {
			type: String,
			trim: true
		}
	};
	return prev;
}, {});

const levelangs = config.game.langs.reduce(function (prev, next) {
	prev[config.shortLangs[next]] = {
		name: {
			type: String,
			trim: true
		},
		unlock_message: {
			type: String,
			trim: true
		}
	};
	return prev;
}, {});

const Factions = new Schema({
	_id: Number,
	name: { type: String, index: true },
	langs: langs,
	levels: [
		new Schema({
			value: Number,
			langs: levelangs
		}, { _id: false })
	]
}, { collection: 'game_factions', validateBeforeSave: false });

module.exports = db.model('GameFactions', Factions);
