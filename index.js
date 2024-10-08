const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser= require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(express.json());
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mrpyxhs.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// create middlewares
const logger = async(req,res,next) =>{
  console.log('called',req.host,req.originalUrl)
  next()

}

// const verifyToken = async(req,res,next)=>{
//   const token = req.cookies?.token;
//   console.log('value of token in middleware', token)
//   if(!token){
//     return res.status(401).send({message:'not authorized'})
//   }
//   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
//     // err
//     if(err){
//       console.log(err)
//       return res.status(401).send({message:'unauthorized'})
//     }

//     // if token is valid then it would be decoded
//     if(decoded){
//       console.log('value in the token',decoded)
//       req.user = decoded

//       next()
//     }
//   })
 
// }

const verifyToken = async(req,res,next)=> {
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=> {
    if(err){
      return res.status(401).send({message:'unauthorized'})
    }
    req.user =decoded
    next()
  })
}

async function run() {
  try {

    const serviceCollection = client.db('carDoctor').collection('services')
    const bookingCollection = client.db('carDoctor').collection('bookings')

    // auth related api 
    app.post('/jwt',logger, async (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict'
        })
        .send({success:true})
    })

    // service related api
    app.get('/services',logger, async (req, res) => {
      const cursor = serviceCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/services/details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query)
      res.send(result)
    })

    app.get('/services/checkout/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })

    // booking / checkout l
    app.get('/bookings',logger,verifyToken, async (req, res) => {
      // console.log(req.query.email)
      // console.log('tokeeeeen',req.cookies.token)
      // console.log('Cookie Token:', req.cookies.token);
      console.log('user in the valid token',req.user)
      // cheaked the user and verify with his email
      if(req.query.email !== req.user.email){
        return res.status(403).send({message:'forbiden access'})
      }
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })


    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })

    app.post('/bookings', async (req, res) => {
      const BookingsData = req.body;
      // console.log(BookingsData)
      const result = await bookingCollection.insertOne(BookingsData)
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const updatedBooking = req.body;
      const filter = { _id: new ObjectId(id) };
      // const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: updatedBooking.status
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result)

    })

    app.delete('/bookings-delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      console.log(result)
      res.send(result)
    })


    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.findOne(query)
      console.log(result)
      res.send(result)
    })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('car doctor server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port}`)
})