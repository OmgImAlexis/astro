var mongoose = require('mongoose');

var torrentSchema = mongoose.Schema({
    title: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    size: Number,
    details: String,
    swarm: {
        seeders: Number,
        leechers: Number
    },
    lastmod: Date,
    imported: Date
});

module.exports = mongoose.model('Torrent', torrentSchema);
