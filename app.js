if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Campground = require('./models/Campground');
const path = require('path');
const Review = require('./models/review');
const catchAsync = require('./utils/catchAsync');
const methodOverride = require('method-override')
const ExpressError = require('./utils/ExpressError')
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const localStrategy = require('passport-local');
const User = require('./models/user');
const multer = require('multer');
const {
    storage
} = require('./cloudinary');
const upload = multer({
    storage
});
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({
    accessToken: mapBoxToken
})




app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

const sessionConfig = {
    
    secret: 'thisisasecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(express.static(__dirname + '/public'));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const dbUrl=process.env.DB_URL;
//'mongodb://localhost:27017/yelp-camp'
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
app.use(express.urlencoded({
    extended: true
}))
app.use(methodOverride('_method'));
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('We are Connected to database');

});




app.set('views', path.join(__dirname, 'views'));
app.listen(3000, () => {
    console.log('listening on port 3000');
})

app.use((req, res, next) => {
    // console.log(req.session);
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/',(req,res)=>{
    res.render('home');
})

app.get('/campgrounds', catchAsync(async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('index', {
        campgrounds
    });
}))

//                                                         CAMPGROUNNDS ROUTES
//Make a new CG Route
app.get('/campgrounds/new', (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }
    res.render('new');
})

// Post for make a new CG
app.post('/campgrounds', upload.array('image'), catchAsync(async (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }
    //console.log(req.body, req.files);
    const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location,
        limit: 1
    }).send();
    //res.send(geoData.body.features[0].geometry.coordinates);

    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.body.features[0].geometry;
    campground.images = req.files.map(f => ({
        url: f.path,
        filename: f.filename
    }));
    campground.author = req.user._id;
    await campground.save();
    console.log(campground);
    req.flash('success', 'Successfully made a Campground');
    res.redirect(`/campgrounds/${campground._id}`)
}))

//EDIT CG route
app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }
    const campground = await Campground.findById(req.params.id);
    if (!campground) {
        req.flash('error', 'Cannot find that campground');
        return res.redirect('/campgrounds');
    }

    res.render('edit', {
        campground
    });
}))

//Show page route
app.get('/campgrounds/:id', catchAsync(async (req, res) => {

    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    //console.log(campground);
    if (!campground) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Cannot find that campground');
        return res.redirect('/campgrounds');
    }
    res.render('show', {
        campground
    });

}))

//UPDATE CG route
app.put('/campgrounds/:id', upload.array('image'), catchAsync(async (req, res) => {

    const campground = await Campground.findById(req.params.id);
    if (!campground.author.equals(req.user._id)) {
        req.flash('error', 'You do not permission to do that');
        return res.redirect(`/campgrounds/${req.params.id}`);
    }
    const camp = await Campground.findByIdAndUpdate(req.params.id, {
        ...req.body.campground
    })
    const imgs = req.files.map(f => ({
        url: f.path,
        filename: f.filename
    }))
    // console.log(req.body);
    campground.images.push(...imgs);
    await campground.save();
    req.flash('success', 'Successfully updated the campground');
    res.redirect(`/campgrounds/${camp._id}`);
}))

//DELETE CG route
app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }
    const campground = await Campground.findById(req.params.id);
    if (!campground.author.equals(req.user._id)) {
        req.flash('error', 'You do not permission to do that');
        return res.redirect(`/campgrounds/${req.params.id}`);
    }
    await Campground.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the campground');
    res.redirect('/campgrounds');
}))

//                                                         REVIEWS Route

//CREATE a new Review
app.post('/campgrounds/:id/reviews', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    //console.log(review);
    req.flash('success', 'Created new review');
    res.redirect(`/campgrounds/${campground._id}`);

}))

//DELETED a review
app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be logged in');
        return res.redirect('/login');

    }

    const {
        id,
        reviewId
    } = req.params;
    await Campground.findByIdAndUpdate(id, {
        $pull: {
            reviews: reviewId
        }
    })
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully deleted the review');
    res.redirect(`/campgrounds/${id}`);

}))

//                                                 LOGIN and REGISTER route
app.get('/register', (req, res) => {
    res.render('register');
})
app.post('/register', catchAsync(async (req, res) => {
    try {
        const {
            email,
            username,
            password
        } = req.body;
        const user = new User({
            email,
            username
        });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err)
                return next(err);
            req.flash('success', 'Welcome to Yelp Camp!');
            res.redirect('/campgrounds');
        })

    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');

    }
}))

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', passport.authenticate('local', {
    failureFlash: true,
    failureRedirect: '/login'
}), (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectURL = req.session.returnTo || '/campgrounds';
    delete req.session.returnTo;
    res.redirect(redirectURL);
})
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Goodbye');
    res.redirect('/campgrounds');
})




app.all('*', (req, res, next) => {
    next(new ExpressError('Page not Found', 404));
})

app.use((err, req, res, next) => {
    const {
        statusCode = 500,
    } = err;
    if (!err.message)
        err.message = 'Something went wrong';
    res.status(statusCode).render('error', {
        err
    });
})