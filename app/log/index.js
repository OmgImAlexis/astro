import path from 'path';
import bunyan from 'bunyan';

import {version} from '../../package';

import config from '../config';

const log = bunyan.createLogger({
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

export default log;
