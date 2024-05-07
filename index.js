const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// midlware

app.use(cors(
  {
    origin:[
      'http://localhost:5173',
      'https://cars-doctor-26d51.web.app',
      'https://cars-doctor-26d51.firebaseapp.com'
      
    ],
    credentials:true
  }
));
app.use(express.json());
app.use(cookieParser());

// console.log(console.log(process.env.DB_PASS));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aymctjj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// midlewers

const logger =async(req,res,next)=>{
  console.log('called',req.host,req.originalUrl);
  next()
}

const verifyToken = async(req,res,next)=>{
  const token = req?.cookies?.token;
  console.log('value of midleware token',token);
  if(!token){
    return res.status(401).send({message:'not authorize'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      console.log(err);
      return res.status(401).send({message: 'unauthorized'})
    }
    console.log('value in the token',decoded);
    req.user=decoded
    next();
  })

}

async function run() {
  try {
    const servicesCollection = client.db("carDoctor").collection("services");
    const bookingsCollection = client.db("carDoctor").collection("bookings");

// auth releted

app.post('/jwt',logger,async(req,res)=>{
  const user = req.body;
  console.log(user);
  const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET)
  res
  .cookie('token',token,{
    httpOnly:true,
    secure:process.env.NODE_ENV === "production" ? true: false,
    sameSite:process.env.NODE_ENV === "production" ? "none": "strict",
    // secure:false,
    // sameSite:true

  })
  .send({success:true})
})



app.get('/logout', async (req, res) => {

  res.clearCookie('token', { maxAge: 0, sameSite: 'none', secure: true })
  .send({ success: true })
})


// gpt

// app.post('/logout', (req, res) => {
//   // Clear the token cookie by setting an empty token with an expired date
//     console.log('log out',user);
//   res.clearCookie('token', {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production" ? true : false,
//       expires: new Date(0), // Set the expiry date in the past
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
//   });
//   res.send({ success: true });
// });



// my

// app.post('/logout',async(req,res)=>{
//   const user =req.body;
//   console.log('log out',user);
//   console.log('abcd');
//   // res.clearCookie("token")
//   res.clearCookie('token',{ httpOnly:true,
//     secure:process.env.NODE_ENV === "production" ? true: false,
//     sameSite:process.env.NODE_ENV === "production" ? "none": "strict",}).send({success:true})
// })

    app.get("/services",logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services", (req, res) => {
      res.send("car-doctor is running");
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { service_id: id };

      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };

      const result = await servicesCollection.findOne(query, options);
      res.send(result);

     
     
    });
 // bokings

    app.get('/bookings',logger,verifyToken,async(req,res)=>{

      // console.log('tok tok tok',req.cookies.token);
      if(req.query.email !== req.user.email ){
        return res.status(203).send({message:'forbidean access'})
      }
      let query={};
      if(req.query?.email){
        query = {email:req.query.email}
      }
 const result = await bookingsCollection.find(query).toArray();
 res.send(result)
    })

    app.post("/bookings", async (req, res) => {
      const bookings = req.body;
      console.log(bookings);
      const result = await bookingsCollection.insertOne(bookings);

      res.send(result);
    });
    app.patch('/bookings/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateBooking = req.body;
      console.log(updateBooking);
      const updateDoc = {
        $set: {
         status: updateBooking.status
        }, }
const result= await bookingsCollection.updateOne(filter,updateDoc);
res.send(result)
  }
  )

    app.delete('/bookings/:id',async(req,res)=>{
      const id =req.params.id;
      const query ={_id:new ObjectId(id)}
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`car-doctor is running on port:${port}`);
});
