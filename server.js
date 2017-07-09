var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const axios = require('axios');
// const Twit = require('twit')
const Twitter = require("node-twitter-api");

const { ObjectID } = require('mongodb');

var app = express();
require('dotenv').load();

const baseURL = "https://fcc-socialapp.herokuapp.com/";

mongoose.connect(process.env.MONGO_URI);
mongoose.Promise = global.Promise;

app.use('/controllers', express.static(process.cwd() + '/app/controllers'));
app.use('/public', express.static(process.cwd() + '/public'));
app.use('/common', express.static(process.cwd() + '/app/common'));

app.use('/css', express.static(process.cwd() + '/public/css'));
app.use('/js', express.static(process.cwd() + '/public/js'));


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

hbs.registerPartials(__dirname + '/views/partials');

app.set('view engine', 'hbs');

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

axios.defaults.headers.common['Authorization'] = 'Bearer CKJIm1aKHYxpJLfIxo8TrXwOLyM2hvdiqzvDqqethjoAB-R17AqFO3CrHnmIGvzup864GershFcC2UMQ65ylLkXv1ke4dR_Nh34m87DWba46tTFXfWKxOzwG6kREWXYx';

var twitter = new Twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    callback: process.env.CALLBACK_URL
})

var _requestSecret;

app.get('/', (req, res) => {
    axios.get('https://api.yelp.com/v3/businesses/search?location=washington')
        .then((response) => {
            res.render('home', {
                title: "Home",
                venue: response.data.businesses
            })
        })
        .catch((e) => console.log(e))
})

app.get('/fetch_rt', (req, res) => {
    // T.get('search/tweets', { q: 'banana since:2011-07-11', count: 100 }, function(err, data, response) {
    //     res.send(data)
    // })

    // Change screen name to be a variable carrying the name of the loggedin user
    // T.get('followers/ids', { screen_name: 'YEWDeveloper' }, function(err, data, response) {
    //     res.send(data)
    // })

    // T.get('account/verify_credentials', { skip_status: true })
    //     .catch(function(err) {
    //         console.log('caught error', err.stack)
    //     })
    //     .then(function(result) {
    //         res.send(result); // Sends logged in user data
    //     })

    twitter.getRequestToken(function(err, requestToken, requestSecret) {
        if (err)
            res.status(500).send(err);
        else {
            _requestSecret = requestSecret;
            res.redirect("https://api.twitter.com/oauth/authenticate?oauth_token=" + requestToken);
        }
    });

});

app.get('/fetched_rt', (req, res) => {
    var requestToken = req.query.oauth_token,
        verifier = req.query.oauth_verifier;

    twitter.getAccessToken(requestToken, _requestSecret, verifier, function(err, accessToken, accessSecret) {
        if (err)
            res.status(500).send(err);
        else
            twitter.verifyCredentials(accessToken, accessSecret, function(err, user) {
                if (err)
                    res.status(500).send(err);
                else
                    res.send(user);
            });
    });
});

app.get('/logout', function(req, res) {
    if (req.session.user)
        req.session.destroy(function(err) {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.redirect('/');
            }
        });

});

// ************************************************************

// FOR DEFAULT 404 PAGE
app.get('*', function(req, res) {
    res.render('404');
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
    console.log('Node.js listening on port ' + port + '...');
});