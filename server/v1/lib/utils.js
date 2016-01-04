'use strict';

var leadZeros = function (num, rate) {
	rate = rate || 2;
	var str = String(num);
	var fill = rate - str.length;
	if (fill <= 0) {
		return str;
	}
	return (new Array(fill + 1)).join('0') + str;
};

var timeParse = function (date, isUTC) {
	let UTC = isUTC ? 'UTC' : '';
	return date[`get${UTC}FullYear`]() + '-' +
		leadZeros(date[`get${UTC}Month`]() + 1) + '-' +
		leadZeros(date[`get${UTC}Date`]()) + ' ' +
		leadZeros(date[`get${UTC}Hours`]()) + ':' +
		leadZeros(date[`get${UTC}Minutes`]()) + ':' +
		leadZeros(date[`get${UTC}Seconds`]());
};

exports.zeros = leadZeros;
exports.time  = timeParse;
