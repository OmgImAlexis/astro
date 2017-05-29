/**
 * @file Provides a class for RSS Feeds
 * @todo Move the startup code to the provider baseclass since it's duplicated across providers
 * @todo Don't call RSS.run() if a run is already in progress. If a run is in progress
 * then don't do anything until the gunzip.on('end') event is triggered.
 * @todo Add tests - There's a lot of code here that could benefit from testing
 */
'use strict';

const PROVIDER_NAME = 'rss';

const zlib = require('zlib');
const url = require('url');

const nconf = require('nconf');
const parseString = require('xml2js').parseString;

const Provider = require(`${__dirname}/provider.js`);

// eslint-disable-next-line one-var
let log, start, end, getProtocol, getCategory, getRequestOptions, getFeedURL, getTorrentInfo;

const userAgent = 'BitCannon (https://github.com/bitcannon-org/bitcannon-web)';

/**
 * Function to parse an RSS feed
 * @todo Reduce complexity of parseString callback
 * @todo Move this function into the RSS class to remove the global variables above
 * @param {Error|undefined} err
 * @param {string} body
 * @param {string} feedURL
 * @param {function} callback
 */
function parse(err, body, feedURL, callback) {
    if (err) {
        throw new Error(err);
    }

    let numberOfItemsParsed = 0;

    parseString(body, (err, result) => {
        const totalNumberOfItems = result.rss.channel[0].item.length;
        let torrentTag = false;
        let torrentNameSpace = false;
        let rssFeed = false;
        let namespace = '';
        let torrent;
        let item;
        const torrentTags = [
            'contentLength',
            'infoHash',
            'seeds',
            'peers'
        ];

        if (err) {
            return callback(err);
        }
        if ('rss' in result) {
            rssFeed = true;
        }
        try {
            if (typeof (result.rss.channel[0].torrent[0].$.xmlns) !== 'undefined') {
        // <torrent xmlns="http://xmlns.ezrss.it/0.1/">
        //    <infoHash>...</infoHash>
        // </torrent>
                torrentTag = true;
            }
        } catch (err) {
            try {
                if (typeof (result.rss.$['xmlns:torrent']) === 'undefined') {
                    throw err;
                }
        // <rss xmlns:torrent="http://xmlns.ezrss.it/0.1/">
        //    <torrent:infoHash>...</torrent:infoHash>
        // </rss>
                torrentNameSpace = true;
            } catch (err) {
                try {
                    if (typeof (result.rss.$['xmlns:atom']) === 'undefined') {
                        throw err;
                    }
          // <rss xmlns:atom="http://www.w3.org/2005/Atom">
          //    ...
          //    <enclosure url="http://example.com/example.torrent"
          //               type="application/x-bittorrent"
          //               length="10000"
          //    />
          //    ...
          // </rss>
                } catch (err) {
                    if (!rssFeed) {
                        log.info('This isn\'t an RSS feed!');
                        log.info('If you think this is a mistake' +
              ' please file an issue (' +
              'https://github.com/bitcannon-org/bitcannon-web/issues)');
                        return callback(err);
                    }
                }
            }
        }

        if (torrentNameSpace) {
            namespace = 'torrent:';
            torrent = result.rss.channel[0].item;
        } else if (torrentTag) {
            torrent = result.rss.channel[0].torrent;
            item = result.rss.channel[0].item;
        } else {
            log.info('Parsing plain RSS or Atom feed');
            log.info('BitCannon works best with feeds ' +
        'that use the torrent format but we\'ll try our best!');
            item = result.rss.channel[0].item;
            torrent = item;
        }
        const struct = {
            swarm: {
                seeders: 0,
                leechers: 0
            }
        };
        for (let i = 0; i < result.rss.channel[0].item.length; i++) {
            struct.category = String(
        getCategory() ||
        torrent[i].category ||
        item[i].category ||
        'Other');

            struct.title = String(
        torrent[i].title ||
        item[i].title);

            struct.details =
        torrent[i].link ||
        item[i].link ||
        torrent[i].guid ||
        item[i].guid ||
        '';

            if (typeof (struct.details) !== 'object') {
                struct.details = new Array(struct.details);
            }

            if (torrentNameSpace || torrentTag) {
        // Iterate over the torrentTags array
                for (let j = 0; j < torrentTags.length; j++) {
                    switch (torrentTags[j]) {
                        case 'seeds':
              // If the feed doesn't contain info on seeders we set it to 0
                            struct.swarm.seeders = Number(torrent[i][namespace + torrentTags[j]]) || 0;
                            break;
            // If the feed doesn't contain info on leechers we set it to 0
                        case 'peers':
                            struct.swarm.leechers = Number(torrent[i][namespace + torrentTags[j]]) || 0;
                            break;
            // Set the id to the infoHash
                        case 'infoHash':
                            struct._id = String(torrent[i][namespace + torrentTags[j]]);
                            break;
            // Set the size to the contentLength
                        case 'contentLength':
                            struct.size = Number(torrent[i][namespace + torrentTags[j]]) ||
                0;
                            break;
                        default:
                            struct[namespace + torrentTags[j]] =
                torrent[i][namespace + torrentTags[j]];
                    }
                }
            }
            if (typeof (struct.title) !== 'string') {
                log.info('Skipping torrent due to missing title');
            } else if (
        torrent[i].enclosure[0].$.url
          .substring(
            (torrent[i].enclosure[0].$.url.length - 8)
          ) === '.torrent' ||
        torrent[i].enclosure[0].$.url.substring(0, 7) === 'magnet:' ||
        torrent[i].enclosure[0].$.type === 'application/x-bittorrent'
      ) {
      // Always pass a copy of struct to getTorrentInfo, not a reference.
      // Using a reference (which is the default behaviour) causes values
      // to change within the function because of the loop.
                getTorrentInfo(
          String(torrent[i].enclosure[0].$.url),
          JSON.parse(JSON.stringify(struct)),
          callback
        );
            }
            numberOfItemsParsed++;
            if (numberOfItemsParsed === totalNumberOfItems) {
                log.info(`[OK] Finished Parsing ${feedURL}`);
            }
        }
    });
}

/**
 * Class representing a torrent RSS feed - Largely recycled from {@link https://github.com/aidanharris/bitcannon/blob/nodejs/src/providers/rss/index.js}
 * @extends Provider
 */
class RSS extends Provider {
    constructor(options) {
        super(PROVIDER_NAME);

        this.duration = options.duration || '@hourly';
        this.setDuration();

        getCategory = () => {
            return options.category;
        };
        getRequestOptions = () => {
            const requestOptions = {
                headers: {
                    'User-Agent': userAgent,
                    'Accept-Encoding': 'gzip'
                }
            };

            let uri = options.url;
            uri = url.parse(uri);

            requestOptions.port = ((uri.port) ? uri.port : ((uri.protocol === 'https:') ? 443 : 80));
            if (uri.auth) {
                requestOptions.auth = uri.auth;
            }
            requestOptions.hostname = uri.hostname;
            requestOptions.path = uri.path;
            return requestOptions;
        };
        getFeedURL = () => {
            return options.url;
        };

        getProtocol = () => {
            return require('../protocol')(getFeedURL());
        };
        log = this.log;
        getTorrentInfo = require('../get-torrent-info')(log);
        start = this.start;
        end = this.end;
    }

    setDuration() {
        super.setDuration(this.duration);
    }

    run() {
        let feed = '';
        getProtocol().get(getRequestOptions(), res => {
            if (res.headers['content-type'] === 'application/x-gzip' ||
          res.headers['content-encoding'] === 'gzip'
        ) {
        // Pipe the response into the gunzip to decompress
                const gunzip = zlib.createGunzip();
                res.pipe(gunzip);
                start = process.hrtime();
                gunzip.on('data', data => {
                    feed += data.toString();
                }).on('error', err => {
                    log.warn(err);
                }).on('end', () => {
                    parse(undefined, feed, getFeedURL(), (err, torrent) => {
                        if (err) {
                            log.trace(err);
                        } else {
                            end = process.hrtime(start);
                            log.info(`elapsed time: ${end[0]} seconds and ${end[1]} nanoseonds.`);
                            log.info(`Processing  ${torrent.title}`);
                            Provider.addTorrent(
                torrent.title, // Title
                torrent.category, // Category / aliases
                torrent.size, // Size
                torrent.details, // Details
                                {
                                    seeders: torrent.swarm.seeders,
                                    leechers: torrent.swarm.leechers
                                }, // Swarm
                Date.now(), // Lastmod
                Date.now(), // Imported
                torrent._id // InfoHash
              );
                        }
                    });
                });
            } else {
                res.on('data', chunk => {
                    res.setEncoding('utf8');
                    feed += chunk;
                });
                res.on('end', () => {
                    parse(undefined, feed, getFeedURL(), (err, torrent) => {
                        if (err) {
                            log.trace(err);
                        } else {
                            end = process.hrtime(start);
                            log.info(`elapsed time: ${end[0]} seconds and ${end[1]} nanoseonds.`);
                            log.info(`Processing ${torrent.title}`);
                            Provider.addTorrent(
                torrent.title, // Title
                torrent.category, // Category / aliases
                torrent.size, // Size
                torrent.details, // Details
                                {
                                    seeders: torrent.swarm.seeders,
                                    leechers: torrent.swarm.leechers
                                }, // Swarm
                Date.now(), // Lastmod
                Date.now(), // Imported
                torrent._id // InfoHash
              );
                        }
                    });
                });
            }
        }).on('error', err => {
            log.warn(err);
        });
    }
}

const feeds = [];

for (let i = 0; i < nconf.get('providers:rss:feeds').length; i++) {
    feeds.push(new RSS(nconf.get('providers:rss:feeds')[Number(i)]));
    feeds[i].startup();
}
