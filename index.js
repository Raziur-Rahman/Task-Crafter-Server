const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middleware 
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.idotoa5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Custom middleware's

const gateman = (req, res, next) => {
  if (!req?.headers?.authorization) {
    return res.status(401).send({ massage: "Unauthorized Access" })
  }
  const token = req?.headers?.authorization.split(' ')[1];
  // console.log("token From middleware: ", token);
  jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: "Unauthorized Access" })

    }
    req.decoded = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db('TaskCrafterDB').collection('users');
    const tasksCollection = client.db('TaskCrafterDB').collection('tasks');

    // JsonWebToken Api's
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN_SECRET, { expiresIn: "6hr" })
      res.send({ token })
    })

    // User's Api is here

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;

      const query = {
        email: user.email
      }

      const existUser = await usersCollection.findOne(query);
      if (existUser) {
        res.send({ massage: "User Already Exist", insertedId: null })
      }
      else {
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }

    })

    // Task related Api's

    app.post('/tasks', async (req, res) => {
      const data = req.body;

      const result = await tasksCollection.insertOne(data);

      res.send(result);

    })
    app.get('/tasks', gateman, async (req, res) => {
      const email = req.decoded.email;
      
      const query ={
        userEmail: email
      }
      const result = await tasksCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/tasks/:id', gateman, async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await tasksCollection.findOne(query);
      res.send(result);
  })

    app.patch('/tasks/:id', gateman, async (req, res) => {
      const id = req.params.id;
      const bodyData = req.body;
      const filter = { _id: new ObjectId(id) };

      let updatedDoc = {
        $set: { ...bodyData }
      };

      // console.log(id, updatedDoc);
      const result = await tasksCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    app.delete("/tasks/:id", gateman, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await tasksCollection.deleteOne(query);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Task Crafter Server is running....");
})
app.listen(port, () => {
  console.log("Task Crafter is Running at port: ", port)
})