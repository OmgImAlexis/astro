import mongoose from 'mongoose';
import Category from './category';

const Schema = mongoose.Schema;

const Torrent = new Schema({
    title: {
        type: String,
        index: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
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
    lastmod: {
        type: Date,
        default: Date.now()
    },
    imported: {
        type: Date,
        default: Date.now()
    },
    infoHash: {
        type: String,
        unique: true,
        index: true
    }
});

Torrent.index({
    title: 'text'
});

Torrent.pre('save', function(next) {
    if (this.isNew) {
        Category.update({
            _id: this.category
        }, {
            $inc: {
                torrentCount: 1
            }
        }).exec((err, updatedDoc) => {
            if (err) {
                next(err);
            }
            if (updatedDoc) {
                next();
            } else {
                next(`We couldn't update the torrent count`);
            }
        });
    }
});

export default mongoose.model('Torrent', Torrent);
