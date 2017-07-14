var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
const hbs = require('hbs');
const bodyParser = require('body-parser');
const axios = require('axios');
// const Twit = require('twit')
var Twitter = require("node-twitter-api");
const _ = require('lodash');

const { ObjectID } = require('mongodb');
const { isLoggedin } = require('./server/middleware/isLoggedin');
const { Venue } = require('./server/db/models/poll');
const { appUser } = require('./server/db/models/appUser')

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
    consumerKey: process.env.CONSUMER_KEY,
    consumerSecret: process.env.CONSUMER_SECRET,
    callback: process.env.CALLBACK_URL
});

var _requestSecret;

app.get('/', (req, res) => {

    var user = false,
        location_query;

    function setLocation() {
        return new Promise(function(resolve, reject) {
            if (req.query.location) {
                location_query = req.query.location;

                if (req.session.user) {
                    appUser.findOne({
                            user_id: req.session.user.id
                        })
                        .then((user) => {
                            if (user) {
                                appUser.findOneAndUpdate({
                                        user_id: req.session.user.id
                                    }, {
                                        $set: {
                                            location: location_query
                                        }
                                    }, { new: true })
                                    .then(() => resolve());

                            } else {
                                var user = new appUser({
                                    user_id: req.session.user.id,
                                    location: location_query
                                });

                                user.save().then(() => resolve())
                            }
                        })


                } else
                    resolve();
            }

            // IF NO QUERY MADE
            else {
                if (req.session.user) {
                    appUser.findOne({
                            user_id: req.session.user.id
                        })
                        .then((user) => {
                            if (user)
                                location_query = user.location;

                            resolve()
                        });
                } else
                    resolve()
            }
        });
    }

    setLocation()

    .then(() => {

        // TO REMOVE A LOGGED IN USER FROM GOING TO A PLACE
        if (req.query.id && req.session.user && req.query.action == "rm_user") {
            var venueID = req.query.id,
                userID = req.session.user.id;

            Venue.findOne({
                venue_id: venueID
            })

            .then((venue) => {
                if (venue)
                    return Venue.findOneAndUpdate({
                        venue_id: venueID
                    }, {
                        $pull: {
                            going_ids: userID
                        }
                    }, { new: true })
            })

            .then((updatedVenue) => {
                res.redirect('/');
            })

            .catch((e) => {
                console.log(e);
                res.redirect('/');
            })


        }

        // TO ADD A LOGGED IN USER TO A PLACE
        else if (req.query.id && req.session.user) {

            var venueID = req.query.id,
                userID = req.session.user.id;

            Venue.findOne({
                    venue_id: venueID
                })
                .then((venue) => {
                    if (venue)
                        return Venue.findOneAndUpdate({
                            venue_id: venueID
                        }, {
                            $addToSet: {
                                going_ids: userID
                            }
                        }, { new: true });

                    var venue = new Venue({
                        venue_id: venueID,
                        going_ids: [userID]
                    });
                    return venue.save();
                })


            .then((venue) => {
                res.redirect('/');
            })

            .catch((e) => {
                console.log(e);
                res.redirect('/');
            });
        }

        // DEFAULT!!
        else {
            if (!location_query) {
                console.log("ENDED HERE!")
                if (req.session.user)
                    user = req.session.user.screen_name;
                res.render('home', {
                    title: "Home",
                    user
                })
            } else {
                url_location_query = encodeURIComponent(location_query);

                axios.get(`https://api.yelp.com/v3/businesses/search?location=${url_location_query}`)
                    .then((response) => {
                        var venues = [];
                        response.data.businesses.forEach((venue) => {
                            var newVenue = _.pick(venue, ['image_url', 'name', 'rating', 'location.address1', 'location.city', 'location.zip_code', 'location.country', 'display_phone', 'id']);

                            newVenue.nOfGoing = 0;
                            newVenue.isUserGoing = false;
                            venues.push(newVenue);
                        });

                        req.session.venues = venues;

                        if (req.session.user)
                            return appUser.findOne({
                                user_id: req.session.id
                            })
                        else
                            return Promise.resolve();
                    })

                .then(() => {
                    if (req.session.user) {
                        // location_query = req.session.user.location;

                        twitter.friends("ids", {
                                cursor: -1,
                                user_id: req.session.user.id
                            },
                            req.session.user.AT,
                            req.session.user.AS,
                            function(err, data, response) {
                                if (err) {
                                    console.log("Error here: **", err);
                                    return Promise.reject(err);
                                }
                                var ids = data.ids;
                                Venue.find()
                                    .then((dbVenues) => {
                                        if (dbVenues) {
                                            req.session.venues.forEach((venue, index, array) => {
                                                dbVenues.forEach((dbVenue) => {
                                                    if (dbVenue.venue_id == venue.id)
                                                        array[index].going_ids = dbVenue.going_ids;
                                                    else
                                                        array[index].going_ids = [];

                                                    // console.log(venue.id)
                                                });
                                            });

                                            req.session.venues.forEach((venue, index, array) => {
                                                venue.going_ids.forEach((going_id) => {
                                                    if (going_id == req.session.user.id) {
                                                        array[index].isUserGoing = true;
                                                        array[index].nOfGoing++;
                                                    }
                                                    // console.log(ids);
                                                    ids.forEach((id) => {

                                                        if (going_id == id)
                                                            array[index].nOfGoing++;

                                                    });

                                                })
                                            });

                                            user = req.session.user.screen_name;

                                            console.log("location", location_query)

                                            return res.render('home', {
                                                title: "Home",
                                                venue: req.session.venues,
                                                user,
                                                user_location: location_query
                                            });

                                        } // END IF //
                                    });
                            });

                    }

                    // IF NOT LOGGED IN
                    else {
                        res.render('home', {
                            title: "Home",
                            venue: req.session.venues,
                            user,
                            user_location: location_query
                        });
                    }

                })


                .catch((e) => res.send({
                    error: e,
                    test: "Test message"
                }));
            }


        }
    })

    .catch((e) => {
        res.send(e);
    })



});

app.get('/fetch_rt', (req, res) => {

    twitter.getRequestToken(function(err, requestToken, requestSecret, results) {
        if (err)
            res.send(err);
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
            res.send(err);
        else
            twitter.verifyCredentials(accessToken, accessSecret, function(err, user) {
                if (err)
                    res.send(err);
                else {
                    req.session.user = user;
                    req.session.user.AT = accessToken;
                    req.session.user.AS = accessSecret;
                    res.redirect('/');
                }
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