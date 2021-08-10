const mongoose = require('mongoose');
const Campground = require('../models/Campground');
mongoose.connect('mongodb://localhost:27017/yelp-camp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
const cities = require('./cities');
const {
    places,
    descriptors
} = require('./seedHelpers');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('We are Connected to database');

});
const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const price = Math.floor(Math.random() * 20) + 10;
        const c = new Campground({
            author: '60f3ce74517b1826542eb6db',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            description: 'lorem ipseujdncjnrjnjnnfjrnjnnfnjccsfxrfrxrxdfx',
            price: price,
            images: [{
                    url: 'https://res.cloudinary.com/dnnc6s20u/image/upload/v1628491338/YelpCamp/os0krd4eieyeiiug7lvu.jpg',
                    filename: 'YelpCamp/os0krd4eieyeiiug7lvu'
                },
                {
                    url: 'https://res.cloudinary.com/dnnc6s20u/image/upload/v1628491338/YelpCamp/xdyezyecotq1f11gqtv6.jpg',
                    filename: 'YelpCamp/xdyezyecotq1f11gqtv6'
                }
            ]


        })
        await c.save();
    }

}
seedDB().then(() => {
    mongoose.connection.close();
});