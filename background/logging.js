'use strict';
const nconf = require('nconf');

try {
    if (!nconf.get('logs:provider') || nconf.get('logs:provider') === 'default') {
        module.exports = require('./logging/bunyan');
    } else {
        module.exports = require('./logging/' + nconf.get('logs:provider'));
    }
} catch (err) {
    console.info(`An error occurred loading the ${(nconf.get('logs:provider') || 'default')} logging provider.
The error is as follows: `);
    console.error(err);
    console.info('Attempting to fallback to default logging provider...');
    try {
        module.exports = require('./logging/bunyan');
    } catch (err) {
        console.info(`An error occurred loading the default logging provider.
The error is as follows: `);
        console.error(err);
        try {
            console.info('Falling back to Console logging: ');
            module.exports = require('./logging/console');
        } catch (err) {
            console.info('Falling back to Console logging failed.');
            console.info('The error is as follows: ');
            console.error(err);
            try {
                console.info('Disabling logging: ');
                module.exports = require('./logging/logger');
            } catch (err) {
                console.info('Disabling logging failed!');
                console.info('The error is as follows: ');
                console.error(err);
                console.info('The application may not work correctly without logging');
            }
        }
    }
}
