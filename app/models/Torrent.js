var mongoose = require('mongoose'),
    Category = require('./Category.js');

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

torrentSchema.index({
    title: 'text'
});

torrentSchema.pre('save', function (next) {
    if (this.isNew) {
        Category.update({
            _id: this.category
        },{
            $inc: { torrentCount: 1 }
        }).exec(function(err, updatedDoc){
            if(err){ console.log(err); }
            if(updatedDoc){
                next();
            } else {
                console.log('We couldn\'t update the torrent count');
            }
        });
    }
});

module.exports = mongoose.model('Torrent', torrentSchema);
