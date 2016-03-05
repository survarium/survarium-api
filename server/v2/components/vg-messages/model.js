const mongoose = require('mongoose');
const db       = require('../../lib/db');

const Schema = mongoose.Schema;

const VgMessages = new Schema({
	date: {
		type : Date,
		index: true
	}

}, {
	collection: 'vg-messages'
});

module.exports = db.model('VgMessages', VgMessages);
