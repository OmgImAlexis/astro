if(!/^win/.test(process.platform)) {
    require('app-module-path').addPath(__dirname.substring(0, __dirname.lastIndexOf('/')) + '/app');
} else {
    require('app-module-path').addPath(__dirname.substring(0, __dirname.lastIndexOf('\\')) + '\\app');
}
var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');

nconf.use('memory');
nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/../config.json')
});

var log = require(__dirname + '/logging.js');

if(
    nconf.get('torrents:whitelist:enabled') &&
    nconf.get('torrents:blacklist:enabled')
) {
    log.error('You cannot use the whitelist and the blacklist at the same time!');
    process.exit(1);
}

if(nconf.get('database:mongodb:enabled')){
    mongoose.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err){
        if (err) {
            log.warn('Cannot connect to mongodb, please check your config.json');
            process.exit(1);
        }
    });
} else {
    log.warn('No database is enabled, please check your config.json'); process.exit(1);
}

for(var provider in nconf.get('providers')) {
    if(provider !== 'provider') {
        if (nconf.get('providers:' + provider + ':enabled')) {
            log.info('Loading provider ' + provider);
            require(__dirname + '/providers/' + provider);
        }
    } else
    {
        log.warn('You cannot directly use the provider file. This is a helper file for other providers.');
    }
}