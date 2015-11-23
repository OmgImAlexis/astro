var mongoose = require('mongoose');

var torrentSchema = mongoose.Schema({
    title: {
        type: String,
        index: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        index: true
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
    infoHash: {
        type: String,
        unique: true,
        index: true
    }
});

torrentSchema.index({ title: 'text' });

module.exports = mongoose.model('Torrent', torrentSchema);
