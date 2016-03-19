const mongoose = require('mongoose');
const db       = require('../../../v1/lib/db');

const Schema = mongoose.Schema;

const VgMessages = new Schema({
	date: {
		type : Date,
		index: true
	},
	forum: {
		id: Number,
		name: String
	},
	topic: {
		id: Number,
		name: String
	},
	post: {
		type: Number,
		index: true
	},
	text: String,
	lang: {
		type: String,
		enum: ['ru', 'en']
	},
	dev: {
		type: Number,
		index: true
	}
}, {
	collection: 'vg_messages'
});

module.exports = db.model('VgMessages', VgMessages);
