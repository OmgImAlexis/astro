require('app-module-path').addPath(__dirname + '../../app');

var path = require('path');
var nconf = require('nconf');

var bunyan = require('bunyan');

// Sets up Bunyan to log to the same file as the BitCannon Server - Could this cause problems?
var log = bunyan.createLogger({
    name: 'Bitcannon',
    version: require('../package.json').version,
    streams: [
        {
            level: 'info',
            stream: process.stdout // log INFO and above to stdout
        }, {
            level: 'error',
            // log ERROR and above to a file
            path: (
                path.resolve(nconf.get('logs:location')).substr(0,2) === './'
            ) ? path.resolve('../' + nconf.get('logs:location')) : nconf.get('logs:location')
        }
    ]
});

nconf.use('memory');
nconf.argv().env('__').file({
    file: path.resolve(__dirname + '/../config.json')
});

for(var provider in nconf.get('providers')) {
    if(nconf.get('providers:' + provider + ':enabled')) {
        console.log('Loading provider ' + provider); // To Do: Add proper logging here
        require(__dirname + '/providers/' + provider);
    }
}