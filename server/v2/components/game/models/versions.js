const mongoose = require('mongoose');
const db = require('../../../../v1/lib/db');

const Schema = mongoose.Schema;

const Versions = new Schema({
	_id: String,
	date: Date
}, { collection: 'game_versions' });

module.exports = db.model('GameVersions', Versions);
