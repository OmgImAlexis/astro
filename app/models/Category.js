var mongoose = require('mongoose');

var categorySchema = mongoose.Schema({
    title: String,
    slug: String,
    aliases: [
        String
    ]
});

function slugify(text) {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
        .replace(/\-\-+/g, '-')      // Replace multiple - with single -
        .replace(/^-+/, '')          // Trim - from start of text
        .replace(/-+$/, '');         // Trim - from end of text
}

categorySchema.pre('save', function (next) {
    this.slug = slugify(this.title);
    next();
});

module.exports = mongoose.model('Category', categorySchema);
