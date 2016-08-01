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
            .replace(/:\d+/, '');
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
            //let replacer = `${req.protocol}://${incomingHost}${req.baseUrl}`;
            let body = an.body;
                /*.replace(/https:\/\/an\.yandex\.ru/g, replacer)
                .replace(new RegExp(`abuseInfo: "${replacer.replace(/([/.])/g, '\$1')}`, 'g'), 'abuseInfo: "https://an.yandex.ru');*/
            
            return res.set(an.headers).send(body);
        })
        .catch(next);
});

module.exports = router;

