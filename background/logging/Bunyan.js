/**
 * @file A logger that outputs using {@link https://github.com/trentm/node-bunyan|Bunyan}
 */

var Logger = require('./Logger');

var path = require('path');

var nconf = require('nconf');
var bunyan = require('bunyan');

// Private Methods
var formatBunyanInfoLog = Symbol();
var logger = Symbol();

/**
 * A logging class that uses {@link https://github.com/trentm/node-bunyan|Bunyan}
 * @extends Logger
 */
class BunyanLogger extends Logger {
    /**
     * Constructs a BunyanLogger class
     * @param {string} threadType - The name of the thing being logged e.g "webui"
     */
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

    /**
     * Logs an informative message
     * @param {string} msg - The message to log
     */
    info(msg) {
        this[logger].info(msg);
    }
    /**
     * Logs a message - An alias of {@link BunyanLogger#info}
     * @param {string} msg - The message to log
     */
    log(msg) {
        return this.info(msg);
    }
    /**
     * Logs a warning
     * @param {string} msg - The message to log
     */
    warn(msg) {
        this[logger].warn(msg);
    }
    /**
     * Logs an error
     * @param {string} msg - The message to log
     */
    error(msg) {
        this[logger].error(msg);
    }
    /**
     * Logs a fatal error
     * @param {string} msg - The message to log
     */
    fatal(msg) {
        this[logger].fatal(msg);
    }
    /**
     * Logs a trace
     * @param {string} msg - The message to log
     */
    trace(msg) {
        this[logger].trace(msg);
    }
    /**
     * Logs a debug message
     * @param {string} msg - The message to log
     */
    debug(msg) {
        this[logger].debug(msg);
    }
}

module.exports = BunyanLogger;