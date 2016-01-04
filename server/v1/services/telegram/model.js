const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');
const db = require('../../lib/db');

const Schema = mongoose.Schema;

const TelegramSchema = new Schema({
	user: {
		type: Number,
		index: true
	},
	chat: {
		type: Number,
		index: true
	},
	events: [{
		type: String,
		index: true
	}]
});

TelegramSchema.plugin(timestamps);

module.exports = db.model('Telegram', TelegramSchema);
