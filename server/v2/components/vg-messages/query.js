const Query = require('../../lib/query');

const supportedListFilters = (function () {
	var filters = {
        'lang': {
            type: 'value'
        }
	};

	return Query.build(filters);
})();

exports.list = supportedListFilters;
