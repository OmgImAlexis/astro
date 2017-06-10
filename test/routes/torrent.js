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

test('should return torrent that matches infoHash', async t => {
    const app = makeApp();
    const category = await request(app).post('/api/category').send({
        title: 'TorrentTest'
    });
    const categoryId = category.body.category._id;
    const torrent = await request(app).post('/api/torrent').send({
        title: 'Ubuntu 17.04 Desktop (64-bit)',
        infoHash: '59066769b9ad42da2e508611c33d7c4480b3857b',
        category: categoryId
    });
    const infoHash = torrent.body.torrent.infoHash;
    const res = await request(app).get(`/api/torrent/${infoHash}`);

    t.is(res.status, 200);
    t.is(res.body.torrent.title, 'Ubuntu 17.04 Desktop (64-bit)');
    t.is(res.body.torrent.infoHash, '59066769b9ad42da2e508611c33d7c4480b3857b');
});
