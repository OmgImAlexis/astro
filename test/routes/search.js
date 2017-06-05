import mongoose from 'mongoose';
import request from 'supertest';
import test from 'ava';
import {makeApp} from '../helpers';

test.before(() => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
});

test.after.always(() => {
    mongoose.connection.db.dropDatabase(() => {
        mongoose.disconnect();
    });
});

// Not too sure why this is trying to set headers after the fact.
// Should return [] since HL3 doesn't exist.
test.failing('should return no search results', async t => {
    const app = makeApp();
    const res = await request(app).get(`/api/search?q=x`);

    t.is(res.status, 200);
    t.is(res.body.torrents.length, 0);
});
