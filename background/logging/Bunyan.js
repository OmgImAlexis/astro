var Logger = require('./Logger');

var path = require('path');

var nconf = require('nconf');
var bunyan = require('bunyan');

// Private Methods
var formatBunyanInfoLog = Symbol();
var logger = Symbol();

class BunyanLogger extends Logger {
    constructor(threadType) {
        super(threadType);

        this[formatBunyanInfoLog] = function () {};
        this[formatBunyanInfoLog].prototype.write = function (rec) {
            console.log('[%s] [%s] %s: %s',
                threadType,
                rec.time,
                bunyan.nameFromLevel[rec.level],
                rec.msg);
        };

        this[logger] = bunyan.createLogger({
            name: 'Bitcannon',
            threadType: threadType,
            version: require('../../package.json').version,
            streams: [
                {
                    level: 'info',
                    stream: new this[formatBunyanInfoLog](), // log INFO and above to stdout
                    type: 'raw'
                }, {
                    level: 'error',
                    // log ERROR and above to a file
                    path: path.resolve(nconf.get('logs:location'))
                }
            ]
        });
    }

    info(msg) {
        this[logger].info(msg);
    }
    log(msg) {
        return this.info(msg);
    }
    warn(msg) {
        this[logger].warn(msg);
    }
    error(msg) {
        this[logger].error(msg);
    }
    fatal(msg) {
        this[logger].fatal(msg);
    }
    trace(msg) {
        this[logger].trace(msg);
    }
    debug(msg) {
        this[logger].debug(msg);
    }
}

module.exports = BunyanLogger;