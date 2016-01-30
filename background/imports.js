require('app-module-path').addPath(__dirname + '../../app');

var path = require('path');
var nconf = require('nconf');
var mongoose = require('mongoose');

nconf.use('memory');
nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/../config.json')
});

var bunyan = require('bunyan');

bunyan.formatBunyanInfoLog = function() {};
bunyan.formatBunyanInfoLog.prototype.write = function (rec) {
    console.log('[%s] %s: %s',
        rec.time,
        bunyan.nameFromLevel[rec.level],
        rec.msg);
};

bunyan.logger = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('../package.json').version,
    streams: [
        {
            level: 'info',
            stream: new bunyan.formatBunyanInfoLog(), // log INFO and above to stdout
            type: 'raw'
        }, {
            level: 'error',
            // log ERROR and above to a file
            path: path.resolve('../' + nconf.get('logs:location'))
        }
    ]
});

var log = bunyan.logger;

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
    if(nconf.get('providers:' + provider + ':enabled')) {
        log.info('Loading provider ' + provider);
        require(__dirname + '/providers/' + provider);
    }
}