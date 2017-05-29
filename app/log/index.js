import path from 'path';
import bunyan from 'bunyan';

import {version} from '../../package';
import {logs as logConfig} from '../../config';

const log = bunyan.createLogger({
    name: 'Bitcannon',
    version,
    streams: [
        {
            level: 'info',
            stream: process.stdout
        }, {
            level: 'error',
            path: logConfig.location || path.resolve(__dirname, '../../logs/error.log')
        }
    ]
});

export default log;
