const mongoose = require('mongoose');
const config   = require('../../../../configs');
const Version = require('./versions');

const Schema = mongoose.Schema;

const langs = config.game.langs.reduce(function (prev, next) {
	prev[config.shortLangs[next]] = {
		name: {
			type: String,
			trim: true
		},
		description: {
			type: String,
			trim: true
		}
	};
	return prev;
}, {});

exports.schema = function (params) {
	var base = params.base;
	base._id = Number;
	base.langs = langs;
	base.item_category = Number;
	base.name = { type: String, index: true };

	return new Schema(base, {
		collection: `game_${params.collection}`,
		validateBeforeSave: false,
		_id: false,
		id: false,
		strict: false
	});
};
