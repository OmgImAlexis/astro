import mongoose from 'mongoose';
import request from 'supertest';
import express from 'express';
import test from 'ava';
import {errorHandler, notFoundHandler} from 'express-api-error-handler';
import {version} from '../package';

import {
    api,
    category,
    core,
    search,
    settings,
    torrent
} from '../app/routes';

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

test.before(() => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
});

test.after.always(() => {
    mongoose.disconnect();
});

test('/api should return 200', async t => {
    const app = makeApp();
    const res = await request(app).get('/api/');
    t.is(res.status, 200);
    t.is(res.body.message, 'Welcome to the Astro API.');
    t.is(res.body.version, version);
});

test('/fail should return 404', async t => {
    const app = makeApp();
    const res = await request(app).get('/fail');
    t.is(res.status, 404);
    t.is(res.body.error, 'route not found');
});

test('/healthcheck should return success', async t => {
    const app = makeApp();
    const uptime = process.uptime();
    const res = await request(app).get('/healthcheck');
    t.is(res.status, 200);
    t.true(res.body.uptime >= uptime);
});
