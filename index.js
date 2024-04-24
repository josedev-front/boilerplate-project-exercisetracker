const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI).catch((err) => console.log(err));

mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error: " + err);
});

let userSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    }
  },
  { versionKey: false }
);

let User = mongoose.model("User", userSchema);

let exerciseSchema = mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    date: String,
    userId: {
      type: String,
      required: true,
    },
  },
  { versionKey: false }
);

let Exercise = mongoose.model("Exercise", exerciseSchema);

const checkDate = (date) => {
  if (!date) {
      return (new Date(Date.now())).toDateString();
  } else {
      const parts = date.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const utcDate = new Date(Date.UTC(year, month, day));
      return utcDate.toDateString();
  }
}

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  let username = req.body.username;
  let existingUser = await User.findOne({ username })
  
  if (username === ""){
    res.json({error: "username is required"})
  }

  if (existingUser){
    return res.json(existingUser)
  }
   
  let user = await User.create({
    username
  })

  res.json(user)
});

app.get("/api/users", async (req, res) => {
  let usersList = await User.find();
  res.json(usersList);
});


app.post("/api/users/:_id/exercises", async (req, res) => {
  let userId = req.params._id;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date = checkDate(req.body.date);

  if (description === ""){
    return res.json({error: "description is required"})
  }

  if (duration === ""){
    return res.json({error: "duration is required"})
  } 
  
  let user = await User.findById(userId).select("username")

  if (!user){
    return res.json({error: "unknown userId"})
  } 

  let exercise = await Exercise.create({
    username: user.username,
    description, 
    duration, 
    date,
    userId,
  });

  return res.json({
    _id: user._id,
    username: user.username,
    date,
    duration,
    description,
  });
});


app.get("/api/users/:_id/logs", async (req, res) => {
  let userId = req.params._id;
  let user = await User.findById(userId).select("username")
  let count = await Exercise.countDocuments({userId})
  let log = await Exercise.find({userId})

  if (!user){
    return res.json({error: "unknown userId"})
  }
  
  if (req.query.from || req.query.to){
    let from = new Date(req.query.from);
    let to = new Date(req.query.to);
    let limit = parseInt(req.query.limit);
    
    if (from == "Invalid Date"){
      from = new Date(0)
    } else {
      from = new Date(from)
    }
    
    if (to == "Invalid Date"){
      to = new Date()
    } else {
      to = new Date(to)
    }

    log = await Exercise.find({userId, date: {$gte: from, $lte: to}}).limit(limit)
    count = log.length
  } else if (req.query.limit){
    let limit = parseInt(req.query.limit);
    log = await Exercise.find({userId}).limit(limit)
    count = log.length
  }
  

  res.json({
    _id: user._id,
    username: user.username,
    count,
    log
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
