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
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');


mongoose.connect('mongodb://localhost:27017/yelp-camp', {
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


app.set('views', path.join(__dirname, 'views'));
app.listen(3000, () => {
    console.log('listening on port 3000');
})

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
app.get('/campgrounds', catchAsync(async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('index', {
        campgrounds
    });
}))


app.get('/campgrounds/new', (req, res) => {
    res.render('new');
})


app.post('/campgrounds', catchAsync(async (req, res, next) => {

    const campground = new Campground(req.body.campground);
    await campground.save();
    req.flash('success', 'Successfully made a Campground');
    res.redirect(`/campgrounds/${campground._id}`)


}))


app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    if (!campground) {
        req.flash('error', 'Cannot find that campground');
        return res.redirect('/campgrounds');
    }

    res.render('edit', {
        campground
    });
}))


app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate('reviews');
    //  console.log(campground);
    if (!campground) {
        req.flash('error', 'Cannot find that campground');
        return res.redirect('/campgrounds');
    }
    res.render('show', {
        campground
    });

}))


app.put('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await Campground.findByIdAndUpdate(req.params.id, {
        ...req.body.campground
    })
    req.flash('success', 'Successfully updated the campground');
    res.redirect(`/campgrounds/${campground._id}`);
}))


app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    await Campground.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the campground');
    res.redirect('/campgrounds');
}))

app.post('/campgrounds/:id/reviews', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    const review = new Review(req.body.review);
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    req.flash('success', 'Created new review');
    res.redirect(`/campgrounds/${campground._id}`);

}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
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


app.all('*', (req, res, next) => {
    next(new ExpressError('Page not Found', 404));
})

app.use((err, req, res, next) => {
    const {
        statusCode = 500,
    } = err;
    if (!err.message)
        err.message = 'Something went wrong';
    //message = "something went wrong";
    res.status(statusCode).render('error', {
        err
    });
    //res.send('Something went Wrong');
})