const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();

// middleware:
app.use(cors());
app.use(express.json());


// MongoDb connecion string
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1moqz.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// MongoDb Operation
async function run() {
    try {
        await client.connect();
        const productCollection = client.db('horizonDb').collection("products");

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
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
            // console.log({ products });
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