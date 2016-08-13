'use strict';

const Promise  = require('bluebird');
const config   = require('../../../configs');
const Items    = require('./models/items');
const Versions = require('./models/versions');
const UiProps  = require('./models/ui_properties');
const Factions = require('./models/factions');
const Mods     = require('./models/modifications');
const Players  = require('../../../v1/components/players/model');
const cache    = require('../../../v1/lib/cache');

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

	if (!thin) {
		project['is_stack'] = 1;
		project['category'] = '$item_category';
        project['visual'] = 1;
        project['owners'] = { $size: '$owners' };
        project['usage'] = 1;
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
		project['level'] = `${versionPath}.parameters.item_level`;
		project['faction'] = `${versionPath}.parameters.faction_data.faction_id`;
		project['drop_weight'] = `${versionPath}.parameters.drop_weight`;
		project['is_premium'] = `${versionPath}.is_premium`;
		project['category'] = `$item_category`;

		projections.push({ $unwind: { path: '$props', preserveNullAndEmptyArrays: true } });

		projections.push({ $lookup: { from: UiProps.collection.name, localField: `props.prop_id`, foreignField: '_id', as: `prop` } });

		projections.push({ $unwind: { path: '$prop', preserveNullAndEmptyArrays: true } });

		projections.push({
			$group: {
				_id: '$id',
				name: { $last: '$name' },
				icon: { $last: '$icon' },
				ver: { $last: '$ver' },
				drop_weight: { $last: '$drop_weight' },
				key: { $last: '$key' },
				level: { $last: '$level' },
				faction: { $last: '$faction' },
				premium: { $last: '$is_premium' },
				category: { $last: '$category' },
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
				drop_weight: 1,
				'props': 1,
				key: 1,
				level: 1,
				faction: 1,
				premium: 1,
				category: 1
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

exports.itemUsage = function itemUsage(id) {
	const cacheKey = `itemUsage:${id}`;
	return Promise
		.props({
			used: cache
				.get(cacheKey)
				.then(count => {
					if (count !== null) {
						return Number(count);
					}

					return Players
						.aggregate([
							{ $match: { 'ammunition.items.item': id } },
							{ $group: { _id: '$_id' } },
							{ $group: { _id  : 1, count: { $sum: 1 } } },
							{ $project: { _id  : 0, count: 1 } }
						])
						.allowDiskUse(true)
						.exec()
						.then(result => {
							if (!result || !result.length) {
								return null;
							}

							return result[0].count;
						})
						.then(count => {
							cache.set(cacheKey, count, 'EX', 60 * 30);
							return count;
						});
				}),
			total: Players.activeCount()
		});
};

exports.versions = function versions() {
	return Versions.aggregate([
		{ $project: {
			date: 1,
			_id: 0,
			id: '$_id'
		} },
		{ $sort: { date: -1 } }
	]);
};

exports.factions = function factions(params) {
	let language = getLang(params.language);

	return Factions.aggregate([
		{ $project: {
			date: 1,
			_id: 0,
			id: '$_id',
			name: `$langs.${language}.name`
		} },
		{ $sort: { id: 1 } }
	]);
};

exports.modifications = function modifications(params, query) {
    let language = getLang(query.language);
    let thin = query.thin !== undefined;
    
    let projection = {
        _id: 0,
        id: '$_id',
        name: `$langs.${language}.name`,
        value: 1,
        postfix: 1
    };
    
    let pipeline = [
        { $project: projection }
    ];
    
    if (params.list) {
        pipeline.unshift({
            $match: { _id: { $in: params.list } }
        });
    }
    
    if (!thin) {
        [
            'drop_weight',
            'modifiers',
            'type_requirements_mask',
            'type_mask',
            'ui_desc',
            'lobby_info'
        ].forEach(field => projection[field] = 1);
        
        let unprop = [
            'id',
            'name',
            'value',
            'postfix',
            'drop_weight',
            'modifiers',
            'type_requirements_mask',
            'type_mask',
            'lobby_info',
            'ui_desc.name',
            'ui_desc.icon',
            'ui_desc.min_value',
            'ui_desc.max_value'
        ].reduce((unprop, field) => {
            unprop[field] = 1;
            return unprop;
        }, {
            'prop.value': '$ui_desc.props_list.prop_value',
            'prop.id': '$prop._id',
            'prop.mod_type': '$prop.mod_type',
            'prop.min_value': '$prop.min_value',
            'prop.max_value': '$prop.max_value',
            'prop.comparable': '$prop.comparable',
            'prop.direction': '$prop.direction',
            'prop.name': `$prop.langs.${language}.name`,
        });
        
        let group = [
            'name',
            'value',
            'postfix',
            'drop_weight',
            'modifiers',
            'type_requirements_mask',
            'type_mask',
            'lobby_info',
            'ui_desc'
        ].reduce((group, field) => {
            group[field] = { $last: `$${field}` };
            return group;
        }, {
            _id: '$id',
            props: { $push: '$prop' }
        });
        
        let finalize = [
            'name',
            'value',
            'postfix',
            'drop_weight',
            'modifiers',
            'type_requirements_mask',
            'type_mask',
            'lobby_info',
            'ui_desc',
            'props'
        ].reduce((finalize, field) => {
            finalize[field] = 1;
            return finalize;
        }, {
            _id: 0,
            id: '$_id'
        });
    
        pipeline.push({ $unwind: { path: '$ui_desc.props_list', preserveNullAndEmptyArrays: true } });
        pipeline.push({ $lookup: { from: UiProps.collection.name, localField: `ui_desc.props_list.prop_id`, foreignField: '_id', as: `prop` } });
        pipeline.push({ $unwind: { path: '$prop', preserveNullAndEmptyArrays: true } });
        pipeline.push({ $project: unprop });
        pipeline.push({ $group: group });
        pipeline.push({ $project: finalize })
    }
    
    pipeline.push({ $sort: { id: 1 } });
    
    return Mods.aggregate(pipeline);
};

exports.one = function (req, res, next) {
    let name = req.params.item;
    
    return Items
        .findOne({
            name: name
        }, {
            name: 1,
            visual: 1
        })
        .then(item => {
            if (!item) {
                throw new Error(`No item ${name} found`);
            }
            
            req.item = item;
            next();
        })
        .catch(next);
};

exports.modelForm = function modelForm(params) {
    let item = params.item;

    return new Promise(resolve => resolve(`<!DOCTYPE html>
        <html>
            <head><title>Item ${item.name} model uploader</title></head>
            <body>
                <h3>Item ${item.name} model uploader</h3>
                <form enctype="multipart/form-data" method="post">
                    <p>Upload ${item.name}.mview</p>
                    <input type="file" name="mview" accept="mview" />
                    <input type="submit">
                </form>
            </body>
        </html>`));
};

exports.modelUpload = function modelUpload(params) {
    let item = params.item;
    let name = item.name;
    
    return item
        .update({ $set: { visual: true } })
        .then(() => `<!DOCTYPE html>
        <html>
            <head><title>Item ${name} model updater</title></head>
            <body>
                <h3>Item ${name} model uploaded OK</h3>
            </body>
        </html>`);
};
