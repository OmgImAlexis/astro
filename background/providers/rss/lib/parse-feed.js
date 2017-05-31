import {EventEmitter} from 'events';
import {promisifyAll} from 'bluebird';
import xml2js from 'xml2js';
import {generateAtomFeed} from '../tests/generate-test-data';

const {parseStringAsync} = promisifyAll(xml2js);

const torrentTags = [
    'contentLength',
    'infoHash',
    'seeds',
    'peers'
];

class ParseFeed extends EventEmitter {
    constructor(feed) {
        super();
        parseStringAsync(feed).then(xml => {
            if ('rss' in xml === false) {
                return this.emit('error', new Error('NotAnRSSFeed'));
            }

            xml.rss.channel[0].item.forEach(item => {
                this.emit('torrent', item);
            });
        }).catch(err => {
            return this.emit('error', err);
        });
    }
}

generateAtomFeed().then(f => {
    new ParseFeed(f).on('torrent', torrent => {
        console.log(torrent);
    }).on('error', err => {
        throw err;
    });
}).catch(e => {
    throw new Error(e);
});

export default ParseFeed;
