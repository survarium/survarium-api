const db = require('../../../../v1/lib/db');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const base = require('./base');

module.exports = db.model('GameItems', base.schema({
	collection: 'items',
	base: {
		is_stack: Boolean,
		t1: String,
		t2: String,
		t3: String,
		owners: [
			{
				type: Schema.Types.ObjectId,
				ref : 'Players'
				/*index: true*/
			}
		],
		usage: Number,
        visual: Boolean
	}
}));
