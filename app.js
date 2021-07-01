const express = require('express');
const mongoose = require('mongoose');
const app = express();
const Campground = require('./models/Campground');
const path = require('path');
const methodOverride = require('method-override')
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


app.get('/campgrounds', async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('index', {
        campgrounds
    });
})


app.get('/campgrounds/new', (req, res) => {
    res.render('new');
})


app.post('/campgrounds', async (req, res) => {
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`)
})


app.get('/campgrounds/:id/edit', async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render('edit', {
        campground
    });
})


app.get('/campgrounds/:id', async (req, res) => {
    const campground = await Campground.findById(req.params.id);
    res.render('show', {
        campground
    });

})


app.put('/campgrounds/:id', async (req, res) => {
    const campground = await Campground.findByIdAndUpdate(req.params.id, {
        ...req.body.campground
    })
    res.redirect(`/campgrounds/${campground._id}`);
})


app.delete('/campgrounds/:id', async (req, res) => {
    await Campground.findByIdAndDelete(req.params.id);
    res.redirect('/campgrounds');
})

app.use((req, res) => {
    res.send('Error 404!! NOT FOUND');
})