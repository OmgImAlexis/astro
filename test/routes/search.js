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

// Should return [] since HL3 doesn't exist.
test('should return no search results', async t => {
    const app = makeApp();
    const res = await request(app).get(`/api/search?q=HL3`);

    t.is(res.status, 200);
    t.deepEqual(res.body.torrents, []);
});
