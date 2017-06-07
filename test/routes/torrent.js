import mongoose from 'mongoose';
import request from 'supertest';
import test from 'ava';
import {makeApp} from '../helpers';
import {Category, Torrent} from '../../src/models';

test.before(async () => {
    mongoose.Promise = Promise;
    mongoose.connect('mongodb://localhost:27017/astro-test-db');
    const unknownCategory = await Category.findOne({title: 'Unknown'}).exec();
    if (!unknownCategory) {
        await Category.create({
            title: 'Unknown',
            aliases: [
                'other',
                'unknown'
            ]
        });
    }
});

test.after.always(() => {
    mongoose.connection.db.dropDatabase(() => {
        mongoose.disconnect();
    });
});

test('should return torrent that matches infoHash', async t => {
    const unknownCategory = await Category.findOne({title: 'Unknown'}).exec();
    await Torrent.create({
        title: 'Ubuntu 17.04 Desktop (64-bit)',
        infoHash: '59066769b9ad42da2e508611c33d7c4480b3857b',
        category: unknownCategory._id
    }).catch(error => {
        t.fail(error);
    });

    const app = makeApp();
    const res = await request(app).get(`/api/torrent/59066769b9ad42da2e508611c33d7c4480b3857b`);

    t.is(res.status, 200);
    t.is(res.body.torrent.title, 'Ubuntu 17.04 Desktop (64-bit)');
    t.is(res.body.torrent.infoHash, '59066769b9ad42da2e508611c33d7c4480b3857b');
});
