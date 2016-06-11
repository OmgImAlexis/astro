class Logger {
    constructor(threadType) {
        this.threadType = threadType;
    }
    // Virtual Methods - Override these in a derived class
    log(msg) {}
    info(msg) {}
    warn(msg) {}
    error(msg) {}
    fatal(msg) {}
    trace(msg) {}
    debug(msg) {}
}

module.exports = Logger;