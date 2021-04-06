const { MongoClient, ObjectID } = require('mongodb')  //.MongoClient
const debug = require('debug')('app:bookController');
const numCustomer = 8; //MongoDB to extract number of books

function getJSON(numCustomer) {
    return new Promise(resolve => {
        const request = require('request');
        let url = `https://randomuser.me/api/?results=${numCustomer}`;

        let options = { json: true };
        var linkArray = [];
        request(url, options, (error, res, body) => {
            if (error) {
                resolve(error)
            };

            if (!error && res.statusCode == 200) {
                // do something with JSON, using the 'body' variable
                for (let i = 0; i < numCustomer; i++) {
                    linkArray.push(body.results[i].picture.large);
                    console.log('from requestHTTP', linkArray[i]);
                }
            };
            resolve(linkArray);
        });
    });
};

async function asyncCall(bookService, nav, req, res, option) {
    console.log('calling getJSON()');
    // MongoDB connection
    const url = 'mongodb://localhost:27017';
    const dbName = 'libraryApp';

    if (option == 1) {
        const faceLinkArray = await getJSON(numCustomer);
        console.log('async', faceLinkArray);

        (async function mongo() {
            let client;
            try {
                client = await MongoClient.connect(url);
                debug('Connected correctly to MongoDB server');
                const db = client.db(dbName);

                const col = await db.collection('books');
                const books = await col.find().toArray();

                let contactName = new Array();
                let customerName = new Array();
                let city = new Array();
                let customerNumber = new Array();

                for (let i = 0; i < books.length; i++) {
                    customerName.push(books[i].title);
                    contactName.push(books[i].author);
                    city.push(books[i].genre);
                    customerNumber.push(books[i]._id);
                }

                res.render('bookListView',
                    {
                        nav,
                        title: 'Mongo Books List',
                        length: books.length,
                        customerName,
                        contactName,
                        city,
                        customerNumber,
                        picture: faceLinkArray,
                        link: '/MongoDB/'
                    });
            } catch (err) {
                debug(err.stack);
            }
            client.close();
        }());


    } else if (option == 2) {
        const numCustomer = 1;
        const faceLinkArray = await getJSON(numCustomer);
        console.log('async', faceLinkArray);
        debug(req.params);
        const { id } = req.params;

        (async function mongo2() {
            let client;
            try {
                client = await MongoClient.connect(url);
                debug('Connected correctly to MongoDB server');
                const db = client.db(dbName);

                const col = await db.collection('books');
                const book = await col.findOne({ _id: new ObjectID(id) });
                debug(book);
                // API connect to openLibrary
                const libraryAPI  = await bookService.getBookById(book.title);
                console.log('libraryAPI', libraryAPI);

                let { title, author, genre, _id, } = book;
                console.log('MongoDB Book details:', book, title, author, genre, _id);
                res.render('bookView',
                    {
                        nav,
                        title: 'Individual Book Details',
                        customerName: title,
                        contactName: author,
                        comm1: `Genre: ${genre}`,
                        comm2: `URL: ${libraryAPI.link}`,
                        comm3: `First Published Year: ${libraryAPI.first_publish_year}`,
                        detail_1: `Book ID: ${libraryAPI.OLID_ID}`,
                        detail_2: `Subject: ${libraryAPI.subject}`,
                        detail_3: `Description: ${libraryAPI.description}`,
                        picture: `http://covers.openlibrary.org/a/olid/${libraryAPI.authorpix}-L.jpg`,
                        // picture: `http://covers.openlibrary.org/b/olid/${book.desc.bookCover}-L.jpg`,
                        // picture: faceLinkArray[0],
                    });



            } catch (err) {
                debug(err.stack);
            }
        }());
    };
};


function bookController(bookService, nav) {
    console.log('bookService',bookService);
    function getIndex(req, res) {
        asyncCall(bookService, nav, req, res, 1);
    }
    function getById(req, res) {
        asyncCall(bookService, nav, req, res, 2);
    }
    function middleware(req, res, next) {
        if (req.user) {
            next();
        } else {
            res.redirect('/');
        }
    }
    return {
        getIndex, getById, middleware
    };
};

module.exports = bookController;