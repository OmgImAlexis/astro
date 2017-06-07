import log from './log';

const noOp = () => {};

const cleanUp = callback => {
    // Attach user callback to the process event emitter
    // if no callback, it will still exit gracefully on Ctrl-C
    callback = callback || noOp;
    process.on('cleanup', callback);

    // Do app specific cleaning before exiting
    process.on('exit', () => {
        process.emit('cleanup');
    });

    // Catch ctrl+c event and exit normally
    process.on('SIGINT', () => {
        log.info('Shutting down the server.');
        process.exit(2);
    });

    // Catch uncaught exceptions, trace, then exit normally
    process.on('uncaughtException', error => {
        log.warn('Uncaught Exception. Shutting down.');
        log.warn(error.message);
        log.trace(error.stack);
        process.exit(99);
    });
};

export default cleanUp;
