'use strict';

const got = require('got');
const router = require('express').Router();
const config = require('../../../configs');

const HOST = 'an.yandex.ru';

router.all('*', (req, res, next) => {
    if (config.env !== 'production' && req.path.match(/^\/page/)) {
        req.query['page-ref'] = req.query['target-ref'] = req.headers.referer = req.query['target-ref']
            .replace('http:', 'https:')
            .replace('.dev', '.pro')
            .replace(':3000', '');
    }
    
    let incomingHost = req.headers.host;
    req.headers.host = HOST;
    
    got(`https://${HOST}${req.path}`,
        {
            method: req.method,
            query: req.query,
            retries: 0,
            headers: req.headers
        })
        .then(an => {
            let replacer;
            
            if (req.secure) {
                replacer = /an\.yandex\.ru/g;
                incomingHost = `${incomingHost}${req.baseUrl}`;
            } else {
                replacer = /(https:\/\/)?an\.yandex\.ru/g;
                incomingHost = `${req.protocol}://${incomingHost}${req.baseUrl}`;
            }
            
            res.set(an.headers).send(an.body.replace(replacer, incomingHost));
        })
        .catch(next);
});

module.exports = router;

