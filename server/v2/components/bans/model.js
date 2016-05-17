const mongoose = require('mongoose');
const db       = require('../../../v1/lib/db');

const Schema = mongoose.Schema;

const Bans = new Schema({
	date: {
		type : Date,
		index: true
	},
	vg_message: {
		type: Schema.Types.ObjectId,
		ref : 'VgMessages'
	},
	players: [
		{
			player: {
				type: Schema.Types.ObjectId,
				ref : 'Players'
			},
			clan: {
				type: Schema.Types.ObjectId,
				ref : 'Clans'
			}
		}
	]
}, {
	validateBeforeSave: false
});

module.exports = db.model('Bans', Bans);
