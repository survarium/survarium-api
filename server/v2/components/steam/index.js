'use strict';

const got = require('got');

const router = require('express').Router();
const config = require('../../../configs').steam;
const cache  = require('../../../v1/lib/cache');

const API = config.api;
const ONLINE = `${API}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/`;
const ONLINE_TTL = 60;
const ONLINE_KEY = `STEAM:ONLINE`;

function ONLINE_FETCH () {
    return got(ONLINE, {
        json: true,
        query: {
            appid: config.appid
        },
        retries: 0
    }).then(response => {
        return response.body.response.player_count;
    });
}

router.get('/online', (req, res, next) => {
    let send = (count) => res.json({ count: count });
    
    cache.get(ONLINE_KEY)
        .then(count => {
            if (count !== null) {
                return Number(count);
            }
            
            return ONLINE_FETCH()
                .then(count => {
                    cache.set(ONLINE_KEY, count, 'EX', ONLINE_TTL);
                    return count;
                });
        })
        .then(count => send(count))
        .catch(next);
});

module.exports = router;

