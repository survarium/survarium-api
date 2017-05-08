'use strict';

const mongoose = require('mongoose');
const db = require('../../lib/db');
const cache = new (require('../../lib/cache-in-mem'))();

const Schema = mongoose.Schema;

const Place = new Schema({
    title: {
        type: String,
        trim: true,
        index: true
    },
	deletedAt: Date
}, { timestamps: true });

Place.statics.findOrCreate = function (query) {
    return this.findOne(query)
        .lean()
        .then(elem => (elem || this.create(query)));
};

Place.statics.get = function (query) {
    const cacheKey = `${query.title}`;
    const mongoQuery = { title: query.title };

    return cache
        .get(cacheKey)
        .catch(() =>
            this
            .findOrCreate(mongoQuery)
            .then(elem => {
                cache.set(cacheKey, elem);

                return elem;
            })
        );
};

module.exports = db.model('Place', Place);
