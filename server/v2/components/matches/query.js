const Query = require('../../lib/query');

const supportedListFilters = (function () {
	var filters = {
        'id': {
            type: 'number'
        },
		'level': {
			type: 'number',
			max : 10
		},
        'date': {
		    type: 'date'
        }
	};

	return Query.build(filters);
})();

exports.list = supportedListFilters;
