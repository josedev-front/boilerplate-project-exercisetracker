const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const checkDate = (date) => {
  if (!date) {
      return (new Date(Date.now())).toISOString().slice(0, 10);
  } else {
      const parts = date.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const utcDate = new Date(Date.UTC(year, month, day));
      return utcDate.toISOString().slice(0, 10);
  }
}

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
    date: checkDate(req.body.date) // Utilizar la función checkDate para manejar la fecha
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
            date: exercise.date.toDateString()
          });
        }
      });
    }
  });
});
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    let query = { userId };

    // Si se proporciona el parámetro "from", se agrega a la consulta
    if (from) {
      query.date = { $gte: new Date(from) };
    }

    // Si se proporciona el parámetro "to", se agrega a la consulta
    if (to) {
      query.date = { ...query.date, $lte: new Date(to) };
    }

    // Realizar la consulta a la base de datos para obtener los registros de ejercicio
    let exercises = await exerciseModel.find(query);

    // Si se proporciona el parámetro "limit", limitar la cantidad de registros de ejercicio
    if (limit) {
      exercises = exercises.slice(0, parseInt(limit));
    }

    // Crear el objeto de respuesta
    const responseObj = {
      _id: userId,
      logs: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      })),
      count: exercises.length
    };

    res.json(responseObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Your app is listening on port ${PORT}`);
});