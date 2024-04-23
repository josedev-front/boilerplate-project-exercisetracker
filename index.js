const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const userModel = mongoose.model("User", userSchema);
const exerciseModel = mongoose.model("Exercise", exerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  let username = req.body.username;
  let newUser = new userModel({ username: username });
  newUser.save((err, user) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(user);
    }
  });
});

app.get('/api/users', (req, res) => {
  userModel.find({}, (err, users) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else {
      res.json(users);
    }
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  let userId = req.params._id;
  let exerciseObj = {
    userId: userId,
    description: req.body.description,
    duration: req.body.duration,
    date: req.body.date ? new Date(req.body.date) : Date.now()
  };

  let newExercise = new exerciseModel(exerciseObj);

  userModel.findById(userId, (err, userFound) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (!userFound) {
      res.status(404).json({ error: "User not found" });
    } else {
      newExercise.save((err, exercise) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          res.json({
            _id: userFound._id,
            username: userFound.username,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toISOString().slice(0, 10)
          });
        }
      });
    }
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  let userId = req.params._id;
  let responseObj = {};
  let limitParam = req.query.limit ? parseInt(req.query.limit) : 0;
  let toParam = req.query.to;
  let fromParam = req.query.from;
  let queryObj = { userId: userId };

  if (fromParam || toParam) {
    queryObj.date = {};
    if (fromParam) {
      queryObj.date['$gte'] = new Date(fromParam);
    }
    if (toParam) {
      queryObj.date['$lte'] = new Date(toParam);
    }
  }

  userModel.findById(userId, (err, userFound) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    } else if (!userFound) {
      res.status(404).json({ error: "User not found" });
    } else {
      responseObj = {
        _id: userFound._id,
        username: userFound.username
      };

      exerciseModel.find(queryObj).limit(limitParam).exec((err, exercises) => {
        if (err) {
          console.error(err);
          res.status(500).json({ error: "Internal Server Error" });
        } else {
          exercises = exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString()
          }));
          responseObj.log = exercises;
          responseObj.count = exercises.length;
          res.json(responseObj);
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Your app is listening on port ${PORT}`);
});