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
        'rating_match': {
		    type: 'boolean'
        },
        'date': {
		    type: 'date'
        }
	};

	return Query.build(filters);
})();

exports.list = supportedListFilters;
