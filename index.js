const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(express.static('public'))
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
//mongodb
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const {Schema} = mongoose;

//Created exerciseSchema
const exerciseSchema = new Schema({
  username: String,
  count: Number,
  log : [Object]
});

//create a model called Exercise from the exerciseSchema
const Exercise=mongoose.model("Exercise", exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//create a New User
app.post('/api/users', (req, res,done) => {
  const {username} = req.body;

  let createNewUser = new Exercise({
    username:username,
    count:0,
    log:[]
    });

  //find if exist
  Exercise.findOne({username: username}, (err, data)=> {
    if (!err) return console.log("User Exist")
    done(null, data);
  });
  //since not exist, create
  createNewUser.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data)
  });
  //response after create
  res.json({
    username: createNewUser.username,
    _id: createNewUser._id
  });
});

//list all user available
app.get('/api/users', (req, res,done) => {
  let arr;
  Exercise.find()
  .select({
    count: 0 ,__v:0,log:0
  })
  .exec((err, data)=> {
    if(err) {done(err)};
    res.json(data);
    done(null, data);
  });
});

//add exercise
app.post('/api/users/:_id/exercises', (req, res, done) => {
  //obtener los detalles del ejercicio desde la solicitud
  let { description, duration, date } = req.body;
  let { _id } = req.params;

  if (!date) {
    date = new Date();
    date = date.toDateString();
  } else {
    date = new Date(date);
    date = date.toDateString();
  };

  //buscar el usuario por su ID
  Exercise.findById(_id, (err, exercise) => {
    if (err) return console.log(err);
    if (!exercise) { return res.json({ "_id": "unfound" }) };

    //agregar el ejercicio al registro del usuario
    exercise.count++;
    exercise.log.push({
      description,
      duration,
      date
    });

    //guardar los cambios en la base de datos
    exercise.save((err, updatedExercise) => {
      if (err) return console.log(err);

      //buscar el usuario actualizado para devolverlo como respuesta
      Exercise.findById(_id, (err, updatedUser) => {
        if (err) return console.log(err);
        res.json(updatedUser); //devolver el usuario actualizado con los campos de ejercicio agregados
        done(null, updatedExercise);
      });
    });
  });
});

//list log
app.get('/api/users/:_id/logs', (req, res,done) => {
  const {_id} = req.params;
  let {from, to, limit}= req.query;

  Exercise.findById(_id, (err, exercise) => {
    if (err) return console.log(err);
    if (!exercise){return res.json({"_id":"unfound"})};

    exercise.log.forEach(a => a.duration = parseInt(a.duration)); // Asegurar que duration sea un número
    if (from){exercise.log.filter(a => a.date>=from)};
    if (to){exercise.log.filter(a => a.date>=to)};
    if (limit){exercise.log=exercise.log.slice(0,limit)}
    
    res.json({
      _id: _id,
      username: exercise.username,
      count: parseInt(exercise.count),
      log: exercise.log
    });
    
    done(null, exercise);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})