/**
 * @file a simple module to return either the http or https module
 * depending on the url provided
 */

/**
 * @func protocol
 * @description Returns the http or https module depending on url
 * @param {string} url - The url to evaluate
 */
module.exports = function protocol(url) {
    if(url.indexOf('https://') === 0) {
        console.log(url);
        return require('https');
    } else if(url.indexOf('http://') === 0) {
        return require('http');
    } else {
        throw new Error('Invalid URI');
    }
};
