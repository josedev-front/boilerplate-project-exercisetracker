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
    type: Date, // Cambiado a tipo Date
    required: true
  }
}, { autoIndex: false });

const checkDate = (date) => {
  if (!date) {
    return new Date(); // Devuelve la fecha actual si no se proporciona ninguna fecha
  } else {
    const parts = date.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    return new Date(year, month, day); // Devuelve un objeto de fecha
  }
};

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

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userid = req.params._id;

    const newExercise = new Exercise({
      userid,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    const savedExercise = await newExercise.save();

    const user = await User.findById(userid);

    const response = {
      _id: user._id,
      username: user.username,
      description,
      duration: savedExercise.duration, // Utilizar el valor de duración del ejercicio guardado
      date: new Date(savedExercise.date).toDateString()
    };
    console.log('Tipo de datos de duration en el response:', typeof response.duration); 
    console.log('Response:', response);
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// Add an exercise for a specific user
/*app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userid = req.params._id;
    
    // Formatear la fecha utilizando la función checkDate()
    const formattedDate = checkDate(date);

    // Guardar el nuevo ejercicio en la base de datos
    const newExercise = new Exercise({
      userid,
      description,
      duration,
      date: formattedDate.toDateString() // Formatear la fecha utilizando toDateString()
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
      date: formattedDate.toDateString() // Formatear la fecha utilizando toDateString()
    };

    // Imprimir el objeto response en la consola
    console.log('Response:', response);

    // Devolver la respuesta combinada
    res.json(response);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});*/


// Get full exercise log of any user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userid = req.params._id;
    const { from, to, limit } = req.query;
    const query = { userid };

    // Verificar si los parámetros from y to son fechas válidas
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if ((from && isNaN(fromDate.getTime())) || (to && isNaN(toDate.getTime()))) {
      return res.status(400).json({ error: "Las fechas from y to deben estar en formato aaaa-mm-dd." });
    }

    // Construir el filtro de fecha
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
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

    // Agregar un console log para ver los ejercicios formateados
    //console.log('formattedExercise:', formattedExercises);

    // Devolver la respuesta con el registro de ejercicios
    res.json({ _id: userid, count: formattedExercises.length, log: formattedExercises });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
  


/** Start the server */
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
