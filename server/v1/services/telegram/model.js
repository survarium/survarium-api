const mongoose = require('mongoose');
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
}, { timestamps: true });


module.exports = db.model('Telegram', TelegramSchema);
