'use strict';
var nconf = require('nconf');

var mongoose = require('mongoose');
var Category = require('models/Category.js');
var Torrent = require('models/Torrent.js');

var log = require(__dirname + '/../logging.js');
var torrentsToAdd = [];
class Provider {
    constructor(provider) {
        // Set the duration a provider should run
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

        // Set whether or not a provider should run at startup
        if(typeof(nconf.get('providers:' + provider + ':config:startup')) === 'boolean') {
            this.runAtStartup = nconf.get('providers:' + provider + ':config:startup');
        } else {
            this.runAtStartup = false;
        }
    }

    // Checks if a torrent should be added to the database
    static shouldAddTorrent(category) {
        if(nconf.get('torrents:whitelist:enabled')) {
            if(nconf.get('torrents:whitelist:categories').forEach(function(el) {
                    if(el.toUpperCase() === category.toUpperCase()) {
                        return true;
                    }
             })) {
                return true;
            }
        } else if(nconf.get('torrents:blacklist:enabled')) {
            if(!nconf.get('torrents:blacklist:categories').forEach(function(el) {
                    if(el.toUpperCase() === category.toUpperCase()) {
                        return true;
                    }
             })) {
                return true;
            }
        } else {
            return true;
        }

        return false;
    }

    // Add a torrent to the database
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
            if(!swarm.hasOwnProperty('seeders')) {
                swarm.seeders = 0;
            }
            if(!swarm.hasOwnProperty('leechers')) {
                swarm.leechers = 0;
            }
        }
         Category.findOne({
         $or: [
            {'title': new RegExp(aliases, 'i')},
            {'aliases': new RegExp(aliases, 'i')}
         ]
         }).exec(function (err, category) {
             if (err) {
                log.warn(err);
             }
             // If the category does not exist then add it to the database
             if(!category) {
                 // Maintain a queue to prevent duplicate categories being added
                 if(torrentsToAdd.indexOf(aliases) === -1) {
                     // Push an empty array followed by the name of the category we will be creating
                     torrentsToAdd.push([],aliases);
                     // Create the category
                     Category.create({
                         title: aliases,
                         aliases: [
                             aliases
                         ],
                         torrentCount: 0
                     }, function(err, cat) {
                         if(err) {
                             log.warn(err);
                             log.warn('Error creating category ' + aliases);

                         } else {
                             Provider.addTorrent(title,aliases,size,details,swarm,lastmod,imported,infoHash);
                             for(var i = 0; i < torrentsToAdd[torrentsToAdd.indexOf(aliases)-1].length; i++) {
                                 var torrent = torrentsToAdd[torrentsToAdd.indexOf(aliases)-1][i];
                                 Provider.addTorrent(torrent.title,aliases,torrent.size,torrent.details,torrent.swarm,torrent.lastmod,torrent.imported,torrent.infoHash);
                             }
                             // Perform cleanup on the torrentsToAdd array
                             delete torrentsToAdd[torrentsToAdd.indexOf(aliases)-1];
                             delete torrentsToAdd[torrentsToAdd.indexOf(aliases)];
                         }
                     });
                 } else {
                     torrentsToAdd[torrentsToAdd.indexOf(aliases)-1].push(
                         {
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
                        }
                    );
                 }
             } else {
                 Torrent.findOne({
                    infoHash: infoHash
                 }).exec(function (err, exists) {
                     if (!exists) {
                         Torrent.create({
                             title: title,
                             category: category._id,
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
                         }, function (err) {
                             if (err) {
                                log.warn(err);
                             }
                         });
                     }
                 });
             }
         });
    }
}

module.exports = Provider;