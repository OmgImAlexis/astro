/**
 * @file A logging base class
 */

/**
 * Logging class - This should be extended by another class
 */
class Logger {
    /**
     * Constructs a Logger class
     * @param {string} threadType - The name of the thing being logged e.g "webui"
     */
    constructor(threadType) {
        this.threadType = threadType;
    }
    
    /**
     * Logs a message
     * @virtual
     * @param {string} msg - The message to log
     */
    log(msg) {}
    /**
     * Logs an informative message
     * @virtual
     * @param {string} msg - The message to log
     */
    info(msg) {}
    /**
     * Logs a warning
     * @virtual
     * @param {string} msg - The message to log
     */
    warn(msg) {}
    /**
     * Logs an error
     * @virtual
     * @param {string} msg - The message to log
     */
    error(msg) {}
    /**
     * Logs a fatal error
     * @virtual
     * @param {string} msg - The message to log
     */
    fatal(msg) {}
    /**
     * Logs a trace
     * @virtual
     * @param {string} msg - The message to log
     */
    trace(msg) {}
    /**
     * Logs a debug message
     * @virtual
     * @param {string} msg - The message to log
     */
    debug(msg) {}
}

module.exports = Logger;