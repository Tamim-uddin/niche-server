
const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;


const app = express();
const port = process.env.PORT || 5000;




const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ww2yo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next){
if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];

    try{
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
    }

    catch{

    }

}


    next();
}




async function run() {

    try {
       await client.connect();
      
        const database = client.db('sunglasses');
        const productsCollection = database.collection('products');
        const reviewsCollection = database.collection('reviews');
        const bookingsCollection = database.collection('bookings');
        const usersCollection = database.collection('users');

        // collect Products from client side
        app.post('/products', async(req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result);
        });

        // send all products
        app.get('/products', async(req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.json(products);
        });

        // collect reviews from client
        app.post('/reviews', async(req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });

        // send all reviews
        app.get('/reviews', async(req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.json(reviews);
        });

        // load booking info
        app.post('/bookings', async(req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingsCollection.insertOne(booking);
            res.json(result);
        });
        
        // send booking info via email
        app.get('/bookings', verifyToken, async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const cursor =  bookingsCollection.find(query);
            const bookings = await cursor.toArray();
            res.json(bookings);
        });


        // send all bookings
        app.get('/bookings/admin', async(req, res) => {
            const cursor = bookingsCollection.find({});
            const bookings = await cursor.toArray();
            res.json(bookings);
        })

        // delete specipic booking
        app.delete('/bookings/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await bookingsCollection.deleteOne(query);
            console.log(result);
            res.json(result)
        })

        // load user
        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        // make admin
        app.put('/users', verifyToken, async(req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if(requester){
                const requesterAccount = await usersCollection.findOne({email: requester});
                if(requesterAccount.role === 'admin'){
                    const filter = {email: user.email};
                    const updateDoc = {$set: {role: 'admin'}};
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else{
                res.status(403).json({message: 'you dont have access to make admin'});
            }
           
        });

        // secure an admin
        app.get('/users/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin'){
                isAdmin = true;
            }
            res.json({admin: isAdmin})
        });



    }
    finally {
        // await client.close();
    }



}
run().catch(console.dir);






app.get('/', (req, res) => {
  res.send('Hello sunglasses')
})

app.listen(port, () => {
  console.log(`port ${port}`)
})