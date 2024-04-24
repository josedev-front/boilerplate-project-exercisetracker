const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mySecret = process.env['MONGO_URI']

main().catch(err => console.log(err));

async function main() {
  await mongoose.connect(mySecret);
}
//-----------
const userSchema = mongoose.Schema({
  username: String,
  _id: String
});
const exerciseSchema = mongoose.Schema({
  duser: String,
  description:{
    type: String,
    required: true
  },
  duration:{
      type: Number,
      required: true
  },
  date: Date
});

var User = mongoose.model('user',userSchema);
var exercise = mongoose.model('exercise',exerciseSchema);
//------------
app.post('/api/users',async function(req,res){
  const user = req.body.username;
  try{
    const username = await User.findOne({username: user});
    if(username == null){
      let newId = new mongoose.mongo.ObjectId();
      const newUser = new User({username: req.body.username, _id: newId});
      await newUser.save();
      res.json({'username':newUser.username,'_id': newUser._id});
    }else{
      res.json({'username':username.username,'_id': username._id});
    }

  }catch(err){

    res.status(500).json(err);
  }
});
//--------------------
app.get('/api/users',async function(req,res){
  try{
    var users = [];
    users = await User.find();
    res.json(users);
  }catch(err){
    res.status(500).json(err);
  }

})

app.post('/api/users/:_id/exercises', async function(req,res){
  const id = req.params._id;
  const data = req.body;

  let date;
  if(data.date == null || data.date == ''){
    date = new Date();
  }else{
    date = data.date;
  }

  try{
    const newexer = new exercise({
      duser: id,
      description:data.description,
      duration: data.duration,
      date:date
    });
    await newexer.save();
    const user = await User.findById(id).exec();


    res.json({
      username:  user.username,
      _id: user._id,
      description:newexer.description,
      duration:newexer.duration,
      date: new Date(newexer.date).toDateString()

    });
  }catch(err){
    res.status(500).json(err);

  }
});

app.get('/api/users/:_id/exercises', async function(req,res){
  const id = req.params._id;
  try{
    const exers = await exercise.find({duser: id});
    res.json(exers);
 }catch(err){
    res.status(500).json(err);

  }
})

app.get('/api/users/:_id/logs',async function(req,res){
  const id = req.params._id;
  const { from, to, limit } = req.query;
  let dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from)
  }
  if (to){
    dateObj["$lte"] = new Date(to)
  }
  let filter = {
    duser: id
  }
  if(from || to){
    filter.date = dateObj;
  }

  try{
    const user = await User.findById(id).exec();
    const exers = await exercise.find(filter).limit(+limit ?? 500);
    const num = await exercise.find({ duser: id}).count().exec();
    let log = exers.map((e) => {
            return {
                'description': e.
description
,
              'duration': e.duration,
                'date': new Date(e.date).toDateString()
        };
    });
    res.json({
      username: user.username,
      count : num,
      _id: user._id,
     log});
 }catch(err){
    res.status(500).json(err);

  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})