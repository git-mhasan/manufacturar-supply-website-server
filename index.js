const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middleware:
app.use(cors());
app.use(express.json());


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

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
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