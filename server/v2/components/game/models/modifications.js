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

const Modifications = new Schema({
	_id: { type: Number, index: { unique: true } },
	langs: langs,
    value: Number,
    postfix: String,
    drop_weight: Number
}, { collection: 'game_modifications', validateBeforeSave: false, strict: false });

module.exports = db.model('Modifications', Modifications);
