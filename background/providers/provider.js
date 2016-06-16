/**
 * @file Provides a baseclass for archive providers
 */

'use strict';
var nconf = require('nconf');

var MongoClient = require('mongodb').MongoClient;
var uri = 'mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection');
var db;

/**
 * will reuse connection if already created
 * @todo Move this to a seperate module along
 * with any other database code.
 */
function connect(callback) {
    if (db === undefined) {
        MongoClient.connect(uri, {
            poolSize: 10000000,
            raw: true
        }, function(err, conn) {
            if(err) {
                return callback(err);
            }
            db = conn;
            callback(null, conn);
        });
    } else {
        callback(null, db);
    }
}

var log, getProvider;

/**
 * Class representing an archive provider
 * @todo Move database code into a separate module. This will pave the way for using other databases.
 */
class Provider {
    /**
     * Constructs a Provider
     * @param {string} provider - The name of an archive provider
     */
    constructor(provider) {
        this.provider = provider;
        getProvider = () => {
          return this.provider;
        };
        this.log = require(__dirname + '/../logging.js');
        log = this.log = new this.log('imports:' + provider);
        // Sets the duration a provider should run
        switch(nconf.get('providers:' + provider + ':config:duration')) {
            case '@hourly':
                this.duration = 3600000;
                break;
            case '@daily':
                this.duration = 86400000;
                break;
            default:
                this.duration = Number(nconf.get('providers:' + provider + ':config:duration'));
        }

        // Sets whether or not a provider should run at startup
        if(typeof(nconf.get('providers:' + provider + ':config:startup')) === 'boolean') {
            this.runAtStartup = nconf.get('providers:' + provider + ':config:startup');
        } else {
            this.runAtStartup = false;
        }
        connect(function(err, conn) {
            if(err) {
                log.warn('Cannot connect to mongodb, please check your config.json');
                process.exit(1);
            }
            db = conn;
            console.log("Connected correctly to server");
        });
    }

    /**
     * Closes any open connections to the db
     * @param {function} callback - Callback to execute after closing any connections to the db
     */
     static closeDB(callback) {
       connect(function(err, db) {
         db.close(false, function(dbCloseErr){
           if(!err) {
             err = dbCloseErr;
           }
           if(typeof(callback) === 'function') {
             return callback(err);
           }
         });
       });
     }

    /**
     * Checks if a torrent should be added to the database
     * @param {string} category - A torrents category
     */
    static shouldAddTorrent(category) {
        if(nconf.get('torrents:whitelist:enabled')) {
            for(var i = 0; i < nconf.get('torrents:whitelist:categories'); i++) {
                if(category.toUpperCase() === nconf.get('torrents:whitelist:categories')[i]) {
                    return true;
                }
            }
        } else if(nconf.get('torrents:blacklist:enabled')) {
            for(var j = 0; j < nconf.get('torrents:blacklist:enabled'); j++) {
                if(category.toUpperCase() === nconf.get('torrents:blacklist:categories')[j]) {
                    return false;
                }
            }
        }

        return true;
    }

    /** Add a torrent to the database
      * @todo If we have a .torrent file and don't have a magnet link / infohash we should store the .torrent file
      * either in a directory or in the database. ({@link https://github.com/bitcannon-org/bitcannon-web/issues/19|#19})
      */
    static addTorrent(title, aliases, size, details, swarm, lastmod, imported, infoHash) {

        // Validate Data
        if(typeof(title) !== 'string' || typeof(infoHash) !== 'string') {
            // Bail out because we don't have a title or infoHash
            log.error('Skipping torrent due to a missing title or infoHash');
            return;
        }
        if(!aliases) {
            aliases = 'Other'; // Category isn't defined so set it to 'Other'
        }
        if(!Provider.shouldAddTorrent(aliases)) {
            log.info('Skipping torrent due to being in ' +
                ((nconf.get('torrents:whitelist:enabled')) ? 'whitelist' : 'blacklist')
            );
            return;
        }
        if(!lastmod) {
            lastmod = Date.now();
        }
        if(!imported) {
            imported = Date.now();
        }
        if(!details) {
            details = [];
        }
        if(!swarm || typeof(swarm) !== 'object') {
            swarm = {seeders: 0, leecher: 0};
        } else {
            // Get rid of anything that shouldn't be in the swarm object
            for(var key in swarm) {
                if(key !== 'seeders' && key !== 'leechers') {
                    delete swarm[key];
                }
            }
            if(typeof(swarm.seeders) !== 'number') {
                swarm.seeders = 0;
            }
            if(typeof(swarm.leechers) !== 'number') {
                swarm.leechers = 0;
            }
        }
        connect(function(err, db) {
            if(err) {
                log.warn(err);
                process.exit(1);
            }
            db.collection('torrents').insertOne({
                title: title,
                size: size,
                details: [
                    details
                ],
                swarm: {
                    seeders: swarm.seeders,
                    leechers: swarm.leecher
                },
                lastmod: lastmod,
                imported: imported,
                infoHash: infoHash
            }, function(err) {
                if(err) {
                    // Ignore 'E11000 duplicate key error'
                    if(err.code !== 11000 ||
                      nconf.get('debug') ||
                      nconf.get('providers:' + getProvider() + ':debug')
                    ) {
                      log.warn(err);
                    }
                }
            });
        });
    }
}

module.exports = Provider;
