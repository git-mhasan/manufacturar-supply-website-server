const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
require("dotenv").config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripe = require('stripe')('sk_test_51L3ysAHjBtoU7GQcCZMGgVMK2BMNgk0gmfAkjB1ns2A9lh6gqJzEkEcAqHsxlyYCkD6mEEJ2tcfl1GZ9rps6J2EA00Ej4hziit');

const port = process.env.PORT || 5000;

const app = express();

// middleware:
app.use(cors());
app.use(express.json());


// JWT VErification function
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


// MongoDb connecion string
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1moqz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// MongoDb Operation
async function run() {
    try {
        await client.connect();
        const productCollection = client.db('horizonDb').collection("products");
        const userCollection = client.db('horizonDb').collection("users");
        const orderCollection = client.db('horizonDb').collection("orders");
        const reviewCollection = client.db('horizonDb').collection("reviews");

        // Admin verification function
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }


        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const price = req.body;
            // const price = order.totalPrice;
            const { price: amount } = price;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        });

        // Get all products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
            // console.log({ products });
        });

        // Get product by ID
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            if (id === "undefined" || id === '') {
                res.send({});
            } else {
                const query = { _id: ObjectId(id) };
                const product = await productCollection.findOne(query);
                res.send(product);
            }
        });

        //Insert a new product
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            return res.send({ success: true, result });
        })

        //Update a product after placing order
        app.put('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const availableQuantity = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: availableQuantity,
            };
            const result = await productCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })


        //Delete a product by Admin Only
        app.delete('/product/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);

        })

        // Order Product
        app.post('/order', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });
        });

        // Get all Order by email
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (email === "undefined" || email === '') {
                res.send({});
            } else {
                const query = { userEmail: email };
                const cursor = orderCollection.find(query);
                const userOrder = await cursor.toArray();
                res.send(userOrder);
            }
        });


        // Get an Order by id
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const singleOrder = await orderCollection.findOne(query);
            res.send(singleOrder);
        });


        // Get all Orders
        app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const userOrder = await cursor.toArray();
            res.send(userOrder);
        });


        //Update Shipment History by a current Admin.
        app.put('/orders/ship/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const shipment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { shipment },
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //Payment history and TRX ID update to order
        app.put('/order/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    payment: payment.payment,
                    trxId: payment.transactionId
                },
            };
            const result = await orderCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //Delete Unpaid Order.
        app.delete('/orders/ship/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(filter);
            res.send(result);
        })

        // Get all Reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews);
            // console.log({ products });
        });

        // Add Review by User
        app.post('/review', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            return res.send({ success: true, result });
        });


        // Get all Users: only admin can access
        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        // Get User Role: whether an Admin or not. useAdmin hook
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        //Set an user Admin by a current Admin.
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // Get user by Email
        app.get('/user/profile/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (email === "undefined" || email === '') {
                res.send({});
            } else {
                const query = { email: email };
                const user = await userCollection.findOne(query);
                res.send(user);
            }
        });

        // Update Profile by user.
        app.put('/user/profile/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const updatedUser = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: updatedUser,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        // User Info into the DB and Issue Token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' })
            res.send({ result, token });
        });
    }
    catch (error) {
        console.error(error);
    }
    finally {
        // client.close();
        console.log({ connection: "closed" });
    }
}
run().catch(console.dir);


// enrtry point
app.get('/', (req, res) => {
    res.send("Horizon Server is ok.")
})

app.listen(port, () => {
    console.log("horizon server is listening to ", port);
})