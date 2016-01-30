require('app-module-path').addPath(__dirname + '../../app');

var path = require('path');
var nconf = require('nconf');

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

for(var provider in nconf.get('providers')) {
    if(nconf.get('providers:' + provider + ':enabled')) {
        log.info('Loading provider ' + provider);
        require(__dirname + '/providers/' + provider);
    }
}