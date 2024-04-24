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
const user = mongoose.model("user", userSchema);
const exercise = mongoose.model("exercise", exerciseSchema);

/** Connect to database */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

/** Middleware */
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))

/** Functions */
function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) return false;
  return d.toISOString().slice(0, 10) === dateString;
}

/** Process routes */
app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
  await user.syncIndexes();
  await exercise.syncIndexes();
});

app.post('/api/users/:_id/exercises', async function (req, res) {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  if (date && !isValidDate(date)) {
    return res.json({ error: `${date} is not a valid date - must be in format yyyy-mm-dd` });
  }

  const passedDate = Number((date) ? date.replace(/-/g, '') : new Date().toISOString().substring(0, 10).replace(/-/g, ''));

  const newExercise = new exercise({
    userid: id,
    description: description,
    duration: duration,
    date: passedDate
  });

  const error = newExercise.validateSync();
  if (error) {
    const errMsg = { '': 'Error(s)' };
    if (error.errors.userid !== undefined) {
      errMsg.id = error.errors.userid.message;
    }
    if (error.errors.description !== undefined) {
      errMsg.description = error.errors.description.message;
    }
    if (error.errors.duration !== undefined) {
      errMsg.duration = error.errors.duration.message;
    }
    if (error.errors.date !== undefined) {
      errMsg.date = error.errors.date.message;
    }
    return res.json(errMsg);
  }

  exercise.findOne({ userid: id, description: description })
    .exec(function (err, existingExercise) {
      if (err) {
        return res.json({ error: err });
      }
      if (!existingExercise) {
        newExercise.save(function (err, data) {
          if (err) {
            return res.json({ error: err });
          }
          let d = data.date.toString();
          d = d.substring(0, 4) + '-' + d.substring(4, 6) + '-' + d.substring(6, 9);
          d = new Date(d).toDateString();
          res.json({
            username: username,
            description: description,
            duration: data.duration,
            date: d,
            _id: id
          });
        });
      } else {
        let dd = existingExercise.date.toString();
        dd = dd.substring(0, 4) + '-' + dd.substring(4, 6) + '-' + dd.substring(6, 9);
        dd = new Date(dd).toDateString();
        res.json({
          '': 'Already in the database',
          username: username,
          description: description,
          duration: existingExercise.duration,
          date: dd,
          _id: id
        });
      }
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
