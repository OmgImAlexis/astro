/**
 * @file Provides a class for RSS Feeds
 * @todo Move the startup code to the provider baseclass since it's duplicated across providers
 * @todo Don't call RSS.run() if a run is already in progress. If a run is in progress
 * then don't do anything until the gunzip.on('end') event is triggered.
 */
'use strict';

const PROVIDER_NAME = 'RSS';

var nconf = require('nconf');

const parseString = require('xml2js').parseString;
const parseTorrent = require('parse-torrent');
const zlib = require('zlib');
const url = require('url');

var Provider = require(__dirname + '/provider.js');

var log, interval, start, end, getProtocol, getCategory, getRequestOptions, parse, getFeedURL;

process.send = process.send || function() {};

const userAgent = "BitCannon (https://github.com/bitcannon-org/bitcannon-web)";

function parse(err, body, feedURL, callback) {
  let numberOfItemsParsed = 0;
  function getTorrentInfo(url, struct) {
    if (url.indexOf('http') === 0 || url.indexOf('magnet:') === 0) {
      parseTorrent.remote(url,
        function (err, parsedTorrent) {
          if (err) {
            log.info(err);
            log.info('An error has occurred processing the following' +
              ' torrent:');
            log.info(url);
            log.info('This could mean either the file is damaged or' +
              ' there is a problem with your network connection');
            log.info('Is your Internet connection working?');
            log.info('Does your ISP block or censor?');
            log.info('Do you have any security software such as a ' +
              'firewall or anti-virus?');
            return callback(err, struct);
          }
          if (struct.size === 0) {
            struct.size = parsedTorrent.length;
          }
          struct._id = parsedTorrent.infoHash.toUpperCase();

          struct.swarm.leechers = (struct.swarm.leechers === -1) ? 0 : struct.swarm.leechers;
          struct.swarm.seeders = (struct.swarm.seeders === -1) ? 0 : struct.swarm.seeders;

          return callback(undefined, struct);
        }
      );
    } else {
      struct.swarm.leechers = (struct.swarm.leechers === -1) ? 0 : struct.swarm.leechers;
      struct.swarm.seeders = (struct.swarm.seeders === -1) ? 0 : struct.swarm.seeders;

      return callback(undefined, struct);
    }
  }

  parseString(body, function (err, result) {
    const totalNumberOfItems = result.rss.channel[0].item.length;
    let torrentTag = false;
    let torrentNameSpace = false;
    let atomFeed = false;
    let rssFeed = false;
    let namespace = '';
    let torrent;
    let item;
    const torrentTags = [
      'contentLength',
      'infoHash',
      'seeds',
      'peers',
    ];

    if (err) {
      return callback(err);
    }
    if (result.hasOwnProperty('rss')) {
      rssFeed = true;
    }
    try {
      if (typeof(result.rss.channel[0].torrent[0].$.xmlns) !== 'undefined') {
        // <torrent xmlns="http://xmlns.ezrss.it/0.1/">
        //    <infoHash>...</infoHash>
        // </torrent>
        torrentTag = true;
      }
    } catch (err) {
      try {
        if (typeof(result.rss.$['xmlns:torrent']) !== 'undefined') {
          // <rss xmlns:torrent="http://xmlns.ezrss.it/0.1/">
          //    <torrent:infoHash>...</torrent:infoHash>
          // </rss>
          torrentNameSpace = true;
        } else {
          throw err;
        }
      } catch (err) {
        try {
          if (typeof(result.rss.$['xmlns:atom']) !== 'undefined') {
            // <rss xmlns:atom="http://www.w3.org/2005/Atom">
            //    ...
            //    <enclosure url="http://example.com/example.torrent"
            //               type="application/x-bittorrent"
            //               length="10000"
            //    />
            //    ...
            // </rss>
            atomFeed = true;
          } else {
            throw err;
          }
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
      torrent = result.rss.channel[0].item;
    }
    var struct = {
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
        item[i].guid || '';

      if (typeof(struct.details) !== 'object') {
        struct.details = new Array(struct.details);
      }

      if (torrentNameSpace || torrentTag) {
        // Iterate over the torrentTags array
        for (let j = 0; j < torrentTags.length; j++) {
          switch (torrentTags[j]) {
            case 'seeds':
              // If the feed doesn't contain info on seeders we set it to 0
              struct.swarm.seeders =
                (typeof(torrent[i][namespace + torrentTags[j]]) ===
                'undefined') ? 0 : Number(torrent[i][namespace + torrentTags[j]]);
              break;
            // If the feed doesn't contain info on leechers we set it to 0
            case 'peers':
              struct.swarm.leechers =
                (typeof(torrent[i][namespace + torrentTags[j]]) ===
                'undefined') ? 0 :
                  Number(torrent[i][namespace + torrentTags[j]]);
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
      if (typeof(struct.title) !== 'string') {
        log.info('Skipping torrent due to missing title');
      } else {
        if (typeof(struct._id) !== 'string') {
          if (
            torrent[i].enclosure[0].$.url
              .substring(
                (torrent[i].enclosure[0].$.url.length - 8)
              ) === '.torrent' ||
            torrent[i].enclosure[0].$.url.substring(0, 7) === 'magnet:'
          ) {
          // Always pass a copy of struct to getTorrentInfo, not a reference.
          // Using a reference (which is the default behaviour) causes values
          // to change within the function because of the loop.
            getTorrentInfo(
              String(torrent[i].enclosure[0].$.url),
              JSON.parse(JSON.stringify(struct))
            );
          }
        } else {
          getTorrentInfo(
            String(struct._id),
            JSON.parse(JSON.stringify(struct))
          );
        }
      }
      numberOfItemsParsed++;
      if (numberOfItemsParsed === totalNumberOfItems) {
        log.info('[OK] Finished Parsing ' + feedURL);
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
        getCategory = () => { return options.category; };
        getRequestOptions = () => {
          var requestOptions = {
            headers: {
              "User-Agent": userAgent,
              "Accept-Encoding": "gzip"
            }
          };

          var uri = options.url;
          uri = url.parse(uri);

          requestOptions.port = ((uri.port) ? uri.port : ((uri.protocol === 'https:') ? 443 : 80));
          if(uri.auth) {
            requestOptions.auth = uri.auth;
          }
          requestOptions.hostname = uri.hostname;
          requestOptions.path = uri.path;
          return requestOptions;
        };
        getFeedURL = () => { return options.url; };
        getProtocol = () => { return require('../protocol')(getFeedURL()); };
        log = this.log;
        start = this.start;
        end = this.end;
    }

    run() {
        var feed = '';
        getProtocol().get(getRequestOptions(), function (res) {
            if (res.headers['content-type'] === 'application/x-gzip' ||
                res.headers['content-encoding'] === 'gzip'
              ) {
                // pipe the response into the gunzip to decompress
                var gunzip = zlib.createGunzip();
                res.pipe(gunzip);
                start = process.hrtime();
                gunzip.on('data', function (data) {
                    feed += data.toString();
                }).on('error', function (err) {
                    log.warn(err);
                }).on('end', function () {
                  parse(undefined, feed, getFeedURL(), function(err, torrent) {
                    if(err) {
                      console.trace(err);
                    } else {
                      end = process.hrtime(start);
                      log.info('elapsed time: ' + end[0] + ' seconds and ' + end[1] + 'nanoseonds.');
                      log.info('Processing ' + torrent.title);
                      log.info('Processing ' + torrent.title);
                      Provider.addTorrent(
                          torrent.title, // title
                          torrent.category, // category / aliases
                          torrent.size, // size
                          torrent.details, // details
                          {
                              seeders: torrent.swarm.seeders,
                              leechers: torrent.swarm.leechers
                          }, // swarm
                          Date.now(), // lastmod
                          Date.now(), // imported
                          torrent._id // infoHash
                      );
                    }
                  });
                });
            } else {
              res.on('data', function (chunk) {
                res.setEncoding('utf8');
                feed+=chunk;
              });
              res.on('end', function(){
                parse(undefined, feed, getFeedURL(), function(err, torrent) {
                  if(err) {
                    console.trace(err);
                  } else {
                    end = process.hrtime(start);
                    log.info('elapsed time: ' + end[0] + ' seconds and ' + end[1] + 'nanoseonds.');
                    log.info('Processing ' + torrent.title);
                    Provider.addTorrent(
                        torrent.title, // title
                        torrent.category, // category / aliases
                        torrent.size, // size
                        torrent.details, // details
                        {
                            seeders: torrent.swarm.seeders,
                            leechers: torrent.swarm.leechers
                        }, // swarm
                        Date.now(), // lastmod
                        Date.now(), // imported
                        torrent._id // infoHash
                    );
                  }
                });
              });
            }
        }).on('error', function (err) {
            log.warn(err);
        });
    }
    startup() {
        interval = undefined;
        this.run();
        // if(this.runAtStartup) {
        //     this.run();
        // }
        // if (!isNaN(this.duration)) {
        //     interval = setInterval(this.run, this.duration);
        // } else {
        //     this.log.warn('Invalid duration for provider kat');
        // }
    }
}

var feeds = [];

for(let i = 0; i < nconf.get('providers:rss:feeds').length; i++) {
  feeds.push(new RSS(nconf.get('providers:rss:feeds')[Number(i)]));
  feeds[i].startup();
}
