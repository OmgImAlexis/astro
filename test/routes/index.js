import mongoose from 'mongoose';
import request from 'supertest';
import test from 'ava';
import {makeApp} from '../helpers';

test.before(() => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
});

test.after.always(() => {
    mongoose.disconnect();
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
