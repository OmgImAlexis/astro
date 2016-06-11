class ConsoleLogger {
    constructor(threadType) {
        this.threadType = threadType;
    }

    log(msg) {
        console.log(msg);
    }
    info(msg) {
        console.info(msg);
    }
    warn(msg) {
        console.warn(msg);
    }
    error(msg) {
        console.error(msg);
    }
    fatal(msg) {
        this.error(msg);
    }
    trace(msg) {
        console.trace(msg);
    }
    debug(msg) {
        this.trace(msg);
    }
}

module.exports = ConsoleLogger;