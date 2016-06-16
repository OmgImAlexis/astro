/**
 * @file Imports torrents from various archive provider
 * @todo Add providers to a queue when there are more providers than CPUs / cores.
 * They will then be executed in order after a worker process exits.
 * @todo Handle workers that exit abnormally, log the fact that something went wrong
 * and perhaps queue the provider to be run again?
 */

 var path = require('path');
 var nconf = require('nconf');

 nconf.use('memory');
 nconf.argv().env('__').file({
     file: path.resolve(__dirname + '/../config.json')
 });

 var log = require(__dirname + '/logging.js');
 log = new log('imports');

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
var providers = [];
var workers = [];

var loadProvider = function (provider) {
    if(provider) {
      this.provider = provider;
    }
    log.info('Loading provider ' + this.provider);
    try {
        require(__dirname + '/providers/' + this.provider);
    } catch (e) {
        log.info('An error occurred loading the ' + this.provider + ' provider.');
        log.info('The error is as follows:');
        log.error(e);
    }
};

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

    var newThread;

    var messageHandler = function(msg) {
      log.info('Master ' + process.pid + ' received message from worker ' + this.process.pid + '.', msg);
      console.dir(msg);
      if(msg.hasOwnProperty('provider')) {
        if(msg.provider.hasOwnProperty('name')) {
          if(msg.provider.hasOwnProperty('next')) {
            setTimeout(function(){
              newThread(msg.provider.name);
            }, (msg.provider.next + 1000));
          }
        }
      }
    };

    newThread = function(provider) {
      var availableCluster = false;
      var threadNum;
      if(workers.length < numCPUs) {
        availableCluster = true;
        workers.push(cluster.fork());
        threadNum = workers.length-1;
      } else {
        for(threadNum = 0; threadNum < workers.length; threadNum++) {
          if(!workers[threadNum]) {
            availableCluster = true;
            workers[threadNum] = cluster.fork();
            break;
          }
        }
      }
      if(availableCluster) {
        if(providers.length !== 0) {
          providers.push(String(provider));
          provider = providers.splice(0,1);
        }
        if(provider) {
          // Receive messages from this worker and handle them in the master process.
          workers[threadNum].on('message', messageHandler);
          workers[threadNum].send({"provider": String(provider)});
        } else {
          workers[threadNum].kill();
          workers[threadNum] = undefined;
        }
      } else if(provider) {
        providers.push(String(provider));
      }
    };

    for(var provider in nconf.get('providers')) {
        if(provider !== 'provider') {
            // For single core processors we don't fork, we just load all of the providers
            // and let Node do its thing.
            if(numCPUs === 1) {
              if (nconf.get('providers:' + provider + ':enabled')) {
                loadProvider(String(provider));
              }
            } else if (nconf.get('providers:' + provider + ':enabled')) {
                newThread(String(provider));
            }
        } else {
            log.warn('You cannot directly use the provider file. This is a helper file for other providers.');
        }
    }
    cluster.on('exit', (worker, code, signal) => {
      if (signal) {
        log.info(`worker was killed by signal: ${signal}`);
      } else if (code !== 0) {
        log.info(`worker exited with error code: ${code}`);
      } else {
        if (worker.exitedAfterDisconnect !== true) {
          log.info('worker success!');
          workers[worker.id-1] = undefined;
          newThread();
        }
      }
    });
} else {
  log.info('Worker ' + process.pid + ' has started.');

  // Receive messages from the master process.
  process.on('message', function(msg) {
    console.dir(msg);
    if(!msg.provider) {
      log.info('Worker ' + process.pid + ' received message from master.', msg);
    } else {
      loadProvider(msg.provider);
    }
  });
}