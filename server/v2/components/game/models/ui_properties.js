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

const UiProps = new Schema({
	_id: Number,
	name: { type: String, index: true },
	langs: langs,
	direction: Number,
	min_value: String,
	comparable: Boolean,
	max_value: String,
	mod_type: Number
}, { collection: 'game_ui_properties', validateBeforeSave: false });

module.exports = db.model('GameUiProps', UiProps);
