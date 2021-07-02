const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Campground = require('./models/Campground');
const path = require('path');
const catchAsync = require('./utils/catchAsync');
const methodOverride = require('method-override')
const ExpressError = require('./utils/ExpressError')
const ejsMate = require('ejs-mate');
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


app.set('views', path.join(__dirname, 'views'));
app.listen(3000, () => {
    console.log('listening on port 3000');
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
    res.redirect(`/campgrounds/${campground._id}`)


}))


app.get('/campgrounds/:id/edit', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render('edit', {
        campground
    });
}))


app.get('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render('show', {
        campground
    });

}))


app.put('/campgrounds/:id', catchAsync(async (req, res) => {
    const campground = await Campground.findByIdAndUpdate(req.params.id, {
        ...req.body.campground
    })
    res.redirect(`/campgrounds/${campground._id}`);
}))


app.delete('/campgrounds/:id', catchAsync(async (req, res) => {
    await Campground.findByIdAndDelete(req.params.id);
    res.redirect('/campgrounds');
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
    //essage = "something went wrong";
    res.status(statusCode).render('error', {
        err
    });
    //res.send('Something went Wrong');
})