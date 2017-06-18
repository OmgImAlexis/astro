/* eslint guard-for-in: 0 max-nested-callbacks: 0 */

import {test} from 'ava';

import FeedParser from '../../../../src/background/providers/rss/lib/parse-feed';

import {
    generateAtomFeed,
    generateTorrentNamespacedFeed,
    generateTorrentFeed,
    generateMixedTorrentFeed
} from './generate-test-data';
import torrents from './testdata';

const feeds = [generateAtomFeed, generateTorrentNamespacedFeed, generateTorrentFeed, generateMixedTorrentFeed];

feeds.forEach(fn => {
    fn().then(feed => {
        test.cb(`The ${fn.name} feed should have ${torrents.length} elements`, t => {
            let _count = 0;
            new FeedParser(feed).on('torrent', () => {
                _count++;
            }).on('end', () => {
                t.is(_count, torrents.length);
                t.end();
            });
        });
    });
});

test.cb('The generateMixedTorrentFeed feed should contain "item" objects', t => {
    generateMixedTorrentFeed().then(feed => {
        let _count = 0;
        new FeedParser(feed).on('torrent', torrent => {
            if ('item' in torrent) {
                _count++;
            }
        }).on('end', () => {
            t.is(_count, torrents.length);
            t.end();
        });
    });
});

const torrentTags = [
    'title',
    'category',
    'contentLength',
    'seeds',
    'peers',
    'enclosure'
];

torrentTags.forEach(tag => {
    feeds.forEach(fn => {
        if (fn.name === 'generateAtomFeed') {
            if (tag === 'seeds' || tag === 'peers' || tag === 'category' || tag === 'contentLength') {
                return;
            }
        }
        fn().then(feed => {
            let _count = 0;
            test.cb(`The ${fn.name} feeds "${tag}" tags should be the same as torrents`, t => {
                new FeedParser(feed).on('torrent', torrent => {
                    if (torrent.torrent[tag] instanceof Object) {
                        for (const prop in torrent.torrent[tag]) {
                            t.is(torrent.torrent[tag][prop], torrents[_count][tag][prop]);
                        }
                    } else {
                        t.is(torrent.torrent[tag], torrents[_count][tag]);
                    }
                    _count++;
                }).on('end', () => {
                    t.end();
                });
            });
        });
    });
});
