var mongoose = require('mongoose');

var categorySchema = mongoose.Schema({
    title: String,
    url: String
});

module.exports = mongoose.model('Category', categorySchema);
