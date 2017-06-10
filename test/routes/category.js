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

test('should return test category with no torrents', async t => {
    const app = makeApp();
    const category = await request(app).post('/api/category').send({
        title: 'CategoryTest'
    });
    const slug = category.body.category.slug;
    const res = await request(app).get(`/api/category/${slug}`);

    t.is(res.status, 200);
    t.is(res.body.torrents.length, 0);
});
