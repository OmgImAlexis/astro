var path = require('path');
var nconf = require('nconf');

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