'use strict';

class Cache {
    constructor () {
        this.storage = {};
    }

    get (key) {
        let val = this.storage[key];

        return val ? Promise.resolve(val) : Promise.reject(new Error(`No cached elem '${key}' found`));
    }

    set (key, val) {
        return Promise.resolve(this.storage[key] = val);
    }
}

module.exports = Cache;
