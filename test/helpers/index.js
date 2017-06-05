import express from 'express';
import {errorHandler, notFoundHandler} from 'express-api-error-handler';

import {
    api,
    category,
    core,
    search,
    settings,
    torrent
} from '../../app/routes';

const makeApp = () => {
    const app = express();
    app.use('/', core);

    app.use('/api', api);
    app.use('/api/category', category);
    app.use('/api/search', search);
    app.use('/api/settings', settings);
    app.use('/api/torrent', torrent);

    app.use('/healthcheck', (req, res) => {
        res.status(200).json({
            uptime: process.uptime()
        });
    });

    app.use(errorHandler());
    app.use(notFoundHandler());
    return app;
};

export {
    makeApp // eslint-disable-line import/prefer-default-export
};
