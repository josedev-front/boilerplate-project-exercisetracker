require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Constants */
const ID_LENGTH = 24;
const MINLENGTH = [3, 'Must have at least 3 characters - you entered {VALUE}'];
const IDLENGTH = [ID_LENGTH, `Must be ${ID_LENGTH} characters long - you entered {VALUE}`];

/** Schemas */
const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    dropDups: true,
    trim: true,
    minLength: MINLENGTH
  }
}, { autoIndex: false });

const exerciseSchema = new Schema({
  userid: {
    type: String,
    required: true,
    trim: true,
    minLength: IDLENGTH,
    maxLength: IDLENGTH
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minLength: MINLENGTH
  },
  duration: {
    type: Number,
    required: true,
    min: [1, 'Must be at least 1 minute long']
  },
  date: {
    type: Number,
    required: true
  }
}, { autoIndex: false });

/** Models */
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

/** Connect to database */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

/** Middleware */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

/** Routes */
app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get a list of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add an exercise for a specific user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userid = req.params._id;

    // Guardar el nuevo ejercicio en la base de datos
    const newExercise = new Exercise({
      userid,
      description,
      duration,
      date: date ? new Date(date).getTime() : new Date().getTime()
    });
    const savedExercise = await newExercise.save();

    // Obtener el usuario al que pertenece este ejercicio
    const user = await User.findById(userid);

    // Combinar los campos del ejercicio con los del usuario
    const response = {
      _id: user._id,
      username: user.username,
      description,
      duration,
      date: new Date(savedExercise.date).toDateString() // Convertir a formato de cadena de texto
    };

    // Devolver la respuesta combinada
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get full exercise log of any user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userid = req.params._id;
    const { from, to, limit } = req.query;
    const query = { userid };

    // Agregar condiciones de fecha si se proporcionan los parámetros from o to
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from).toISOString();
      if (to) query.date.$lte = new Date(to).toISOString();
    }

    // Ejecutar la consulta a la base de datos con la limitación de registros
    let exercisesQuery = Exercise.find(query);
    if (limit) exercisesQuery = exercisesQuery.limit(parseInt(limit));

    const exercises = await exercisesQuery;

    // Mapear las fechas a formato de cadena de texto utilizando el método toDateString()
    const formattedExercises = exercises.map(exercise => ({
      ...exercise._doc,
      date: new Date(exercise.date).toDateString()
    }));

    // Devolver la respuesta con el registro de ejercicios
    res.json({ _id: userid, count: formattedExercises.length, log: formattedExercises });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/** Start the server */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});