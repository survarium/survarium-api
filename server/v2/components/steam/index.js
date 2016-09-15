'use strict';

const got = require('got');

const router = require('express').Router();
const config = require('../../../configs').steam;

const API = config.api;
const ONLINE = `${API}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/`;
const ONLINE_TTL = 1 * 60 * 1000;

let ONLINE_COUNT = null;

router.get('/online', (req, res, next) => {
    let send = () => res.json({ count: ONLINE_COUNT });
    
    if (ONLINE_COUNT !== null) {
        return send();
    }
    
    got(ONLINE, {
        json: true,
        query: {
            appid: config.appid
        },
        retries: 0
    }).then(response => {
        ONLINE_COUNT = response.body.response.player_count;
        
        setTimeout(() => ONLINE_COUNT = null, ONLINE_TTL);
        
        send();
    }).catch(next);
});

module.exports = router;

