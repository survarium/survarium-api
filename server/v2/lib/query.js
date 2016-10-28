'use strict';

var number = (function () {
	var check = function check(min, max, val) {
		if (typeof val !== 'number') {
			return false;
		}

		if (max !== undefined && max < val) {
			return false;
		}

		if (min !== undefined && min > val) {
			return false;
		}

		return true;
	};

	return function (field, params, query, result) {
		var max = params.max;
		var min = params.min;

		var $eq = query.$eq;
		var $lte = query.$lte;
		var $gte = query.$gte;

		if (check(min, max, $eq)) {
			result[field] = $eq;
			return result;
		}

		if (check(min, max, $lte)) {
			(result[field] ? result[field] : result[field] = {}).$lte = $lte;
		}

		if (check(min, max, $gte)) {
			(result[field] ? result[field] : result[field] = {}).$gte = $gte;
		}

		return result;
	};
})();

var date = (function () {
	var check = function check(min, max, val) {
        if (typeof val !== 'string') {
            return false;
        }

		let checker = (new Date(val)).getTime();

        if (!checker) {
            return false;
        }

		if (max !== undefined) {
		    let maxCheck = (new Date(max)).getTime();
            if (maxCheck && maxCheck < checker) {
                return false;
            }
		}

		if (min !== undefined) {
            let minCheck = (new Date(min)).getTime();
            if (minCheck && minCheck > checker) {
                return false;
            }
		}

		return true;
	};

	return function (field, params, query, result) {
		var max = params.max;
		var min = params.min;

		var $eq = query.$eq;
		var $lte = query.$lte;
		var $gte = query.$gte;

		if (check(min, max, $eq)) {
			result[field] = $eq;
			return result;
		}

		if (check(min, max, $lte)) {
			(result[field] ? result[field] : result[field] = {}).$lte = $lte;
		}

		if (check(min, max, $gte)) {
			(result[field] ? result[field] : result[field] = {}).$gte = $gte;
		}

		return result;
	};
})();

var boolean = function (field, params, query, result) {
    if (typeof params !== 'boolean') {
        return result;
    }

    result[field] = params;

    return result;
};

exports.build = function build(filters) {
	return function parse(query, result) {
		result = result || {};

		if (!query) {
			return result;
		}

		var fields = Object.keys(query);
		if (!fields.length) {
			return result;
		}

		fields.forEach((field) => {
			let params = filters[field];

			if (!params) {
				return;
			}

			let search;
			try {
				search = JSON.parse(query[field]);
			} catch (e) {}

			if (!search) {
				return;
			}

			switch (params.type) {
				case 'number':
					number(field, params, search, result);
					break;

                case 'date':
                    date(field, params, search, result);
                    break;

                case 'boolean':
                    boolean(field, params, search, result);
                    break;

				default:
					break;
			}
		});

		return result;
	}
};
