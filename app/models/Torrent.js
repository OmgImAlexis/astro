var mongoose = require('mongoose');

var torrentSchema = mongoose.Schema({
    title: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    size: Number,
    details: [
        {
            type: String
        }
    ],
    swarm: {
        seeders: Number,
        leechers: Number
    },
    lastmod: Date,
    imported: Date,
    infoHash: String
});

module.exports = mongoose.model('Torrent', torrentSchema);
