require('app-module-path').addPath(__dirname + '../../app');

var path = require('path');

var nconf = require('nconf');
var bunyan = require('bunyan');

formatBunyanInfoLog = function() {};
formatBunyanInfoLog.prototype.write = function (rec) {
    console.log('[%s] %s: %s',
        rec.time,
        bunyan.nameFromLevel[rec.level],
        rec.msg);
};

logger = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('../package.json').version,
    streams: [
        {
            level: 'info',
            stream: new formatBunyanInfoLog(), // log INFO and above to stdout
            type: 'raw'
        }, {
            level: 'error',
            // log ERROR and above to a file
            path: path.resolve('../' + nconf.get('logs:location'))
        }
    ]
});

module.exports = logger;