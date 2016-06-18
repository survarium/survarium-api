'use strict';

const Promise  = require('bluebird');
const config   = require('../../../configs');
const Items    = require('./models/items');
const Versions = require('./models/versions');
const UiProps  = require('./models/ui_properties');

const langs = config.game.langs;
const shortLangs = config.shortLangs;

function safeVersion(version) {
	return version.replace(/\./g, '_dot_');
}

function getProjections(versions, language, thin) {
	let projections = [];

	let project = {
		_id: 0,
		id: '$_id',
		key: '$name'
	};

	project['name'] = `$langs.${language}.name`;
	project['desc'] = `$langs.${language}.description`;

	if (!thin) {
		project['is_stack'] = 1;
		project['category'] = '$item_category';
	}

	if (!thin && versions && versions.length) {
		versions.forEach((version) => { project[`versions.${safeVersion(version)}`] = 1; });
	} else {
		project.versions = 1;
	}

	if (thin) {
		delete  project.versions;
		let versionPath = `$versions.${safeVersion(versions[0])}`;
		project['ver'] = `${versionPath}.ver`;
		project['icon'] = `${versionPath}.ui_desc.icon`;
		project['props'] = `${versionPath}.ui_desc.props_list`;

		projections.push({ $unwind: '$props' });

		projections.push({ $lookup: { from: UiProps.collection.name, localField: `props.prop_id`, foreignField: '_id', as: `prop` } });

		projections.push({ $unwind: '$prop' });

		projections.push({
			$group: {
				_id: '$id',
				name: { $last: '$name' },
				icon: { $last: '$icon' },
				ver: { $last: '$ver' },
				key: { $last: '$key' },
				props: { $push: { name: `$prop.langs.${language}.name`, value: `$props.prop_value` } }
			}
		});

		projections.push({
			$project: {
				_id: 0,
				id: '$_id',
				name: 1,
				icon: 1,
				ver: 1,
				'props': 1,
				key: 1
			}
		});
	}

	projections.unshift({ $project: project });

	return projections;
}

function getLang(queried) {
	var language = langs[0];

	if (langs.indexOf(queried) > -1) {
		language = queried;
	}

	return shortLangs[language];
}

function getVersion(queried) {
	if (!queried || queried === 'current') {
		return Versions
			.findOne()
			.sort({ date: -1 })
			.lean()
			.then(ver => [ver._id]);
	}

	if (!queried || queried === 'all') {
		return Versions
			.find()
			.sort({ date: -1 })
			.lean()
			.then(vers => vers.map(ver => ver._id));
	}

	return Promise.resolve(queried.split(','));
}

exports.items = function items(items, params) {
	if (!params) {
		params = items;
		items = null;
	}

	function load(version) {
		var pipeline = getProjections(version, getLang(params.language), params.thin !== undefined);

		if (items && items.list.length) {
			let match = { $match: {} };

			match['$match'][items.type] = { $in: items.list };
			pipeline.unshift(match);
		}

		return Items.aggregate(pipeline);
	}

	return getVersion(params.version)
		.then(load);
};
