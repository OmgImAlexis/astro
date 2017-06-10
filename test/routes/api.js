import mongoose from 'mongoose';
import request from 'supertest';
import test from 'ava';
import {version} from '../../package';
import {makeApp} from '../helpers';

test.before(() => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
});

test.after.always(() => {
    mongoose.disconnect();
});

test('should return 200', async t => {
    const app = makeApp();
    const res = await request(app).get('/api');
    t.is(res.status, 200);
    t.is(res.body.message, 'Welcome to the Astro API.');
    t.is(res.body.version, version);
});

test('should return NotImplemented', async t => {
    const app = makeApp();
    const res = await request(app).get('/api/stats');
    t.is(res.status, 501);
    t.is(res.body.error, 'Not Implemented');
});
