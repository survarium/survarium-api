'use strict';

const debug = require('debug')('importer:items');
const Items = require('../models/items');

exports.assignAmmunitionUsage = function assignAmmunitionUsage(player = {}) {
    debug(`usage assignation for player ${player.nickname}`);

    if (!player.ammunition || !player.ammunition.length) {
        debug(`no usage data for player ${player.nickname}`);
        return Promise.resolve();
    }

    const items = Object.keys(player.ammunition.reduce((result, profile) => {
        profile.items && profile.items.length && profile.items.forEach(item => {
            result[item.item] = 1;
        });

        return result;
    }, {}));

    if (!items.length) {
        debug(`no usage for player ${player.nickname}`);
        return Promise.resolve();
    }

    return Items
        .update({ _id: { $in: items } }, { $addToSet: { owners: player._id } }, { multi: true })
        .exec()
        .tap(() => debug(`usage updated for player ${player.nickname}`));
};
