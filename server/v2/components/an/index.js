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
    let hostname = req.hostname;
    
    req.headers.host = HOST;
    
    got(`https://${HOST}${req.path}`,
        {
            method: req.method,
            query: req.query,
            retries: 0,
            headers: req.headers
        })
        /*.then(an => {
            let replacer = `${req.protocol}://${incomingHost}${req.baseUrl}`;
            
            an.body = an.body
                .replace(/https:\/\/an\.yandex\.ru/g, replacer)
                .replace(new RegExp(`abuseInfo: "${replacer.replace(/([/.])/g, '\$1')}`, 'g'), 'abuseInfo: "https://an.yandex.ru');
            
            return an;
        })*/
        .then(an => {
            let cookie = an.headers && an.headers['set-cookie'];
            
            if (cookie) {
                an.headers['set-cookie'] = cookie.map(cook => cook.replace(/domain=an\.yandex\.ru;/, `domain=${hostname};`));
            }
            
            return an;
        })
        .then(an => {
            return res.set(an.headers).send(an.body);
        })
        .catch(next);
});

module.exports = router;

