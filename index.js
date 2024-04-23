const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const UserSchema = new Schema({
  username: String
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date()},
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const user = new User({ username });
    await user.save();
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// aqui el dilema
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params._id;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exercise = new Exercise({
      user_id: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




/*app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const exercise = new Exercise({
      user_id: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await exercise.save();

    // Agregar el ejercicio al usuario
    user.exercises.push(exercise);
    await user.save();

    // Incluir los detalles del usuario en la respuesta
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
      // Puedes incluir más campos del usuario si es necesario
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});*/


// fin el dilema
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const { _id } = req.params;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const filter = { user_id: _id };
    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = new Date(from);
      }
      if (to) {
        filter.date.$lte = new Date(to);
      }
    }

    let exercises = await Exercise.find(filter).limit(+limit || 500);

    exercises = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});