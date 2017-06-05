import mongoose from 'mongoose';
import request from 'supertest';
import test from 'ava';
import {makeApp} from '../helpers';
import {Category} from '../../app/models';

test.before(async () => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
    await Category.create({
        title: 'Test'
    });
});

test.after.always(() => {
    mongoose.connection.db.dropDatabase(() => {
        mongoose.disconnect();
    });
});

test('should return test category with no torrents', async t => {
    const app = makeApp();
    const res = await request(app).get(`/api/category/test`);

    t.is(res.status, 200);
    t.is(res.body.torrents.length, 0);
});
