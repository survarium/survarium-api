const db = require('../../../../v1/lib/db');

const base = require('./base');

module.exports = db.model('GameItems', base.schema({
	collection: 'items',
	base: {
		is_stack: Boolean,
		t1: String,
		t2: String,
		t3: String
	}
}));
