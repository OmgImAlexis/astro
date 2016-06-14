/**
 * @file Imports torrents from various archive provider
 * @todo Add providers to a queue when there are more providers than CPUs / cores.
 * They will then be executed in order after a worker process exits.
 * @todo Handle workers that exit abnormally, log the fact that something went wrong
 * and perhaps queue the provider to be run again?
 */

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var providerId = 1;
var providers = [];
var firstProvider = [];
var workers = [];

/**
 * The idea here is to use the Node.js {@link https://nodejs.org/api/cluster.html|cluster} module
 * to take advantage of multi-core systems (i.e every modern computer). Node.js is single threaded
 * so the cluster module spawns multiple node.js processes. This should theoretically allow us to
 * process multiple archives at a time. However if this code is io bound rather than CPU bound it
 * might make no difference at all. Further testing is required.
 */
if(cluster.isMaster) {
    if(!/^win/.test(process.platform)) {
        require('app-module-path').addPath(__dirname.substring(0, __dirname.lastIndexOf('/')) + '/app');
    } else {
        require('app-module-path').addPath(__dirname.substring(0, __dirname.lastIndexOf('\\')) + '\\app');
    }

    var path = require('path');
    var nconf = require('nconf');

    nconf.use('memory');
    nconf.argv().env('__').file({
        file: path.resolve(__dirname + '/../config.json')
    });

    var log = require(__dirname + '/logging.js');
    log = new log('imports');

    if(
        nconf.get('torrents:whitelist:enabled') &&
        nconf.get('torrents:blacklist:enabled')
    ) {
        log.error('You cannot use the whitelist and the blacklist at the same time!');
        process.exit(1);
    }

    var MongoClient = require('mongodb').MongoClient;

    if(nconf.get('database:mongodb:enabled')){
        MongoClient.connect('mongodb://' + nconf.get('database:mongodb:host') + ':' + nconf.get('database:mongodb:port') + '/' + nconf.get('database:mongodb:collection'), function(err, db) {
            if(err) {
                log.warn('Cannot connect to mongodb, please check your config.json');
                process.exit(1);
            }
            db.close();
        });
    } else {
        log.warn('No database is enabled, please check your config.json');
        process.exit(1);
    }

    for(var provider in nconf.get('providers')) {
        if(provider !== 'provider') {
            if (providerId < numCPUs) {
                if (nconf.get('providers:' + provider + ':enabled')) {
                    workers.push(cluster.fork());
                    workers[providerId - 1].provider = String(provider);
                    workers[providerId - 1].on('online', function () {
                        log.info('Loading provider ' + this.provider);
                        try {
                            require(__dirname + '/providers/' + this.provider);
                        } catch (e) {
                            log.info('An error occurred loading the ' + this.provider + ' provider.');
                            log.info('The error is as follows:');
                            log.error(e);
                        }
                    });
                    providerId++;
                }
            } else {
                log.info('provider to add to queue: ' + provider);
            }
        } else {
            log.warn('You cannot directly use the provider file. This is a helper file for other providers.');
        }
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
}