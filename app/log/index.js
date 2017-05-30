import path from 'path';
import bunyan from 'bunyan';

import config from '../config';
import {version} from '../../package';

const {INFO, TRACE} = bunyan;

const generalLogger = bunyan.createLogger({
    name: 'Bitcannon',
    version,
    streams: [
        {
            level: 'info',
            stream: process.stdout
        }, {
            level: 'error',
            path: config.get('logs.location') || path.resolve(__dirname, '../../logs/error.log')
        }
    ]
});

const mongooseLogger = bunyan.createLogger({
    name: 'Bitcannon',
    src: false,
    serializers: {
        dbQuery: data => {
            const query = JSON.stringify(data.query);
            const options = JSON.stringify(data.options || {});

            return `db.${data.coll}.${data.method}(${query}, ${options});`;
        }
    }
});

if (process.env.NODE_ENV === 'production') {
    generalLogger.level(INFO);
    mongooseLogger.level(INFO);
} else {
    generalLogger.level(TRACE);
    mongooseLogger.level(TRACE);
}

export default generalLogger;

export {
    generalLogger,
    mongooseLogger
};
