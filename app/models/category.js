import mongoose from 'mongoose';
import {slugify} from '../../utils';

const Schema = mongoose.Schema;

const Category = new Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    aliases: [
        String
    ],
    torrentCount: {
        type: Number,
        default: 0
    }
});

Category.pre('save', function(next) {
    this.slug = slugify(this.title);
    next();
});

export default mongoose.model('Category', Category);
