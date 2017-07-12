const mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    twitter_id: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    }
});

var appUser = mongoose.model('appUser', UserSchema);

module.exports = { appUser }