var express = require('express');
var mongoose = require('mongoose');
var session = require('express-session');
const hbs = require('hbs');
const { ObjectID } = require('mongodb');
const bodyParser = require('body-parser');
const axios = require('axios');

var app = express();
require('dotenv').load();

// const baseURL = "https://fcc-y-voting-app.herokuapp.com";

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