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

const parseFeed = feed => {
    return new Promise((resolve, reject) => {
        parseStringAsync(feed).then(xml => {
            if ('rss' in xml === false) {
                return reject(new Error('NotAnRSSFeed'));
            }

            const totalNumberOfItems = xml.rss.channel[0].item.length;

            xml.rss.channel[0].item.forEach(item => {
                console.log(item);
            });
        }).catch(err => {
            return reject(err);
        });
    });
};

generateAtomFeed().then(f => {
    parseFeed(f);
}).catch(e => {
    throw new Error(e);
});

export default parseFeed;
