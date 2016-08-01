'use strict';

const got = require('got');
const router = require('express').Router();
const config = require('../../../configs');

const HOST = 'an.yandex.ru';

router.all('*', (req, res, next) => {
    if (config.env !== 'production') {
        req.query['page-ref'] = req.query['target-ref'] = req.headers.referer = req.query['page-ref']
            .replace('http:', 'https:')
            .replace('.dev', '.pro')
            .replace(':3000', '');
    }
    
    req.headers.host = HOST;
    
    got.stream(`https://${HOST}${req.path}`,
        {
            method: req.method,
            query: req.query,
            retries: 0,
            headers: req.headers
        })
        .on('error', next)
        .pipe(res)
        .on('error', next);
});

module.exports = router;

