const mongoose = require('mongoose');
const db = require('../../lib/db');
const config = require('../../../configs');

const Schema = mongoose.Schema;

const langs = config.api.languages.reduce(function (prev, next) {
	prev[next] = {
		name: {
			type: String,
			trim: true
		},
		mode: {
			type: String,
			trim: true
		},
		weather: {
			type: String,
			trim: true
		}
	};
	return prev;
}, {});

const MapsSchema = new Schema({
	id: {
		type    : Number,
		index   : { unique: true },
		required: true
	},
	lang: langs,
	/* // TODO: Normalize that
	name: {
		type: Schema.Types.ObjectId,
		ref : 'MapName'
	},
	mode: {
		type: Schema.Types.ObjectId,
		ref : 'GameMode'
	},
	weather: {
		type: Schema.Types.ObjectId,
		ref : 'Weather'
	},
	*/
	deletedAt: Date
}, { timestamps: true });

module.exports = db.model('Maps', MapsSchema);
