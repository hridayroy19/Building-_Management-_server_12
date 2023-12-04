const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
var jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_KYE)
const port = process.env.PORT || 5000;

// maidlware
 app.use(cors());
 app.use(express.json());




 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jg43ilw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

  const userCollaction = client.db("buildingManagement").collection("users")
  const roomsCollaction = client.db("buildingManagement").collection("rooms")
  const agreementCollaction = client.db("buildingManagement").collection("agreement")
  const announsmentCollaction = client.db("buildingManagement").collection("announsment")
  const paymentCollectionDatabase = client.db("buildingManagement").collection("payments");


// jwt relatitd api secoure
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
  res.send({ token });
})


   // middlewares verify token
   const verifyToken = (req, res, next) => {
    console.log('inside cerify token', req.headers);
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'no access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'no access' })
      }
      req.decoded = decoded;
      next();
    })
  }

  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollaction.findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  }

// all user

app.get('/users', verifyToken, verifyAdmin, async (req , res)=>{
  const result = await userCollaction.find().toArray()
  res.send(result)
})


app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: ' note access' })
  }
  const query = { email: email };
  const user = await userCollaction.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
  res.send({ admin });
})




app.post('/users', async (req, res) => {
  const user = req.body;
  const query = { email: user.email }
  const existingUser = await userCollaction.findOne(query);
  if (existingUser) {
    return res.send({ message: 'user already exists', insertedId: null })
  }
  const result = await userCollaction.insertOne(user);
  res.send(result);
});

// profile user get
app.get("/users", async( req , res)=>{
  const result = await userCollaction.find().toArray();
  res.send(result);
 } )


app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: 'admin'
    }
  }
  const result = await userCollaction.updateOne(filter, updatedDoc);
  res.send(result);
})



app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await userCollaction.deleteOne(query);
  res.send(result);
})


// make annousment relatited api submite frome

app.get("/announsment", async( req , res)=>{
  const result = await announsmentCollaction.find().toArray();
  res.send(result);
 } )

app.post("/announsment", async ( req , res)=>{
  const roomsItem = req.body;
  const result = await announsmentCollaction.insertOne(roomsItem);
  res.send(result);

 })



// rooms related api

   app.get("/rooms", async( req , res)=>{
    const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      console.log('pagination query', page, size);

    console.log(' current page', req.query);
    const result = await roomsCollaction.find()
    .skip(page * size)
    .limit(size)
    .toArray();
    res.send(result);
    // res.send(result);
   } )

   app.get('/romesCount', async (req, res) => {
    const count = await roomsCollaction.estimatedDocumentCount();
    res.send({ count });
  })



  //  aggrement requst jnno 

  // app.get("/agreement",  async( req , res)=>{
  //   const result = await agreementCollaction.find().toArray();
  //   res.send(result);
  //  } )

  //  app.delete('/agreement/:id', async (req, res) => {
  //   const id = req.params.id;
  //   const query = { _id: new ObjectId(id) }
  //   const result = await agreementCollaction.deleteOne(query);
  //   res.send(result);
  // });
  


  //  up try to me

app.get('/agreement', async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const result = await agreementCollaction.find(query).toArray();
  res.send(result);
});

//  Roomes collation agrement
 app.post("/agreement", async ( req , res)=>{
  const roomsItem = req.body;
  const result = await agreementCollaction.insertOne(roomsItem);
  res.send(result);

 })
//  delet agrement 
app.delete('/agreement/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await roomsCollaction.deleteOne(query);
  res.send(result);
});



// payment relatede

app.post('/create-payment-intent', async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, 'amount inside the intent')

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
});


app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const result = await paymentCollectionDatabase.find(query).toArray();
  res.send(result);
})




app.post('/payments', async (req, res) => {
  const payment = req.body;
  const result = await paymentCollectionDatabase.insertOne(payment);
  console.log('payment info', payment);
  const query = {
    _id: {
      $in: payment.cartIds.map(id => new ObjectId(id))
    }};

const itemsDelete = await agreementCollaction.deleteMany(query)


  res.send({result , itemsDelete})
  });





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

 




 app.get('/' , ( req , res)=>{
    res.send("building management")
 })

 app.listen(port, () =>{
    console.log(`building management system on port ${port}`);
 })