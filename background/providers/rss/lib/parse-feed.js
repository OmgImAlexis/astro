import {EventEmitter} from 'events';
import {promisifyAll} from 'bluebird';
import xml2js from 'xml2js';

const {parseStringAsync} = promisifyAll(xml2js);

const getFeedType = feed => {
    // <torrent xmlns="http://xmlns.ezrss.it/0.1/">
    //    <infoHash>...</infoHash>
    // </torrent>
    if ('torrent' in feed.rss.channel[0]) {
        if (typeof feed.rss.channel[0].torrent[0].$.xmlns !== 'undefined') {
            return {
                torrents: feed.rss.channel[0].torrent,
                items: ('item' in feed.rss.channel[0]) ? feed.rss.channel[0].item : feed.rss.channel[0].torrent,
                namespace: ''
            };
        }
    }

    // <rss xmlns:torrent="http://xmlns.ezrss.it/0.1/">
    //    <torrent:infoHash>...</torrent:infoHash>
    // </rss>
    if (typeof (feed.rss.$['xmlns:torrent']) !== 'undefined') {
        return {
            torrents: feed.rss.channel[0].item,
            items: feed.rss.channel[0].item,
            namespace: 'torrent:'
        };
    }

    // <rss xmlns:atom="http://www.w3.org/2005/Atom">
    //    ...
    //    <enclosure url="http://example.com/example.torrent"
    //               type="application/x-bittorrent"
    //               length="10000"
    //    />
    //    ...
    // </rss>
    return {
        torrents: feed.rss.channel[0].item,
        items: feed.rss.channel[0].item,
        namespace: ''
    };
};

class ParseFeed extends EventEmitter {
    constructor(feed) {
        super();
        parseStringAsync(feed).then(xml => {
            if ('rss' in xml === false || 'channel' in xml.rss === false) {
                this.emit('error', new Error('NotAnRSSFeed'));
            }

            const {torrents, items, namespace} = getFeedType(xml);

            for (let i = 0; i < torrents.length; i++) {
                // Remove the namespace from namespaced feeds so
                // torrent:infoHash becomes infoHash.
                if (namespace !== '') {
                    for (const prop in torrents[i]) {
                        if (prop.startsWith(namespace)) {
                            const newprop = prop.substring(namespace.length);
                            torrents[i][newprop] = torrents[i][prop];
                            delete torrents[i][prop];
                        }
                    }
                }
                // Ocassionally there are RSS feeds that take the following format:
                // <torrent>
                //  ...
                // </torrent>
                // <item>
                //  ...
                // </item>
                // AFAIK this is non-standard (http://www.bittorrent.org/beps/bep_0036.html)
                // but sometimes contains useful information such as a description. In this
                // case we return an object containing both the torrent and item tag
                this.emit('torrent',
                (torrents[i] === items[i]) ? {torrent: torrents[i]} : {torrent: torrents[i], item: items[i]});
            }
        }).catch(err => {
            this.emit('error', err);
        });
    }
}

export default ParseFeed;
