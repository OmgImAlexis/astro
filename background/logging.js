'use strict';
var nconf = require('nconf');

try {
    if(!nconf.get('logs:provider') || nconf.get('logs:provider') === 'default') {
        var logger = require('./logging/Bunyan');
    } else {
        var logger = require('./logging/' + nconf.get('logs:provider'));
    }
} catch (e) {
    console.info('An error occurred loading the ' + (nconf.get('logs:provider') || 'default') + ' logging provider');
    console.info('The error is as follows: ');
    console.error(e);
    console.info('Attempting to fallback to default logging provider...');
    try {
        var logger = require('./logging/Bunyan')
    } catch(e) {
        console.info('An error occurred loading the default logging provider.');
        console.info('The error is as follows: ');
        console.error(e);
        try {
            console.info('Falling back to Console logging: ');
            var logger = require('./logging/Console');
        } catch (e) {
            console.info('Falling back to Console logging failed.');
            console.info('The error is as follows: ');
            console.error(e);
            try {
                console.info('Disabling logging: ');
                var logger = require('./logging/Logger');
            } catch (e) {
                console.info('Disabling logging failed!');
                console.info('The error is as follows: ');
                console.error(e);
                console.info('The application may not work correctly without logging');
            }
        }
    }
}

module.exports = logger;