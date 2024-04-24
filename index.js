const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
let bodyParser = require('body-parser');

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

//Setup Express
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));



//Connect to Atlas MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//Create Schemas
//User
let userSchema = new Schema({
  username: {
    required: true,
    type: String
  },
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

let User = mongoose.model("User", userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.route('/api/users')
  .get((req, res) => {                                    //show all users
    User.find({}, function(err, users) {
      if (err) { return console.log(err) };
      res.json(users);
    })
  })
  .post((req, res) => {                                   //save new user from form
    //create & save User
    var user = new User({ username: req.body.username });
    user.save();
    console.log(user);
    res.json(user);
  })

// save new exercise from form
app.route('/api/users/:_id/exercises')
  // response will be the user object with the exercise fields added.
  .post((req, res) => {
    //check what arrived in the mail!
    console.log("Body:", req.body);
    console.log("Params:", req.params);
    console.log("Query:", req.query);

    //Grab all of the passed parameters and quereis
    console.log("Body ID", req.body._id)
    console.log("Param ID", (req.params._id))
    let date = new Date()





    let userID = req.body[":_id"] || req.params._id;

    //Use the date passed if present
    if (req.body.date !== undefined) {
      console.log("request body contains a date property");
      date = new Date(req.body.date);
      console.log("Passed Date Type: ", typeof (date))

    } else {
      console.log("request body does not contain a date property");
    }

    //format exercise object for logs
    var newExercise = {
      description: req.body.description,
      duration: Number(req.body.duration),
      date: date
    }
    console.log(newExercise)

    // let userID = mongoose.Types.ObjectId(req.params._id);  //cast string to ObjID
    // console.log("typed user ID", userID)
    User.findByIdAndUpdate({ _id: userID }, { $push: { log: newExercise } }, { new: true }, function(err, user) {
      if (err) {
        console.log("Error: User Not Updated")
        return res.status(400).json({ error: "User Not Updated" })
      }
      let stringyDate = date.toDateString()
      console.log(stringyDate)
      let returnRes = {
        username: user.username,
        _id: user._id,
        description: req.body.description,
        duration: Number(req.body.duration),
        date: stringyDate
      }
      console.log("Return Exercise Log: ", returnRes)
      return res.status(201).json(
        {
          username: user.username,
          _id: user._id,
          description: req.body.description,
          duration: Number(req.body.duration),
          date: stringyDate
        }
      )
    })

  })


app.route('/api/users/:_id/logs')
  .get((req, res) => {
    console.log("Query:", req.query);
    let limit;
    if (req.query.limit) {
      limit = req.query.limit;
    }

    User.findOne(({ _id: req.params._id }), function(err, user) {
      if (err) {
        console.log("User not found");
        return res.status(400).json({ error: "User Not Found" });
      }
      //create copy of the user's log to filter and limit
      let workingLog = user.log;

      //filter the exercise log by dates
      if (req.query.startDate && req.query.endDate) {
        let startDate = new Date(req.query.startDate);
        let endDate = new Date(req.query.endDate);
        tempLog = workingLog.filter((elem) => {
          console.log("elem", elem.date);
          return elem.date >= startDate && elem.date <= endDate
        });
        workingLog = tempLog;
      }

      //limit the number of exercises returned
      if (limit) {
        slicedLog = workingLog.slice(0, limit);
        workingLog = slicedLog;
      }

      //convert the date to a string to fulfill user story
      let test = workingLog.map(item => {
        return (
          {
            description: item.description,
            duration: item.duration,
            date: item.date.toDateString()
          }
        )
      })

      //rebuid the expected response 
      let exerciseLog = {
        username: user.username,
        _id: user._id,
        count: workingLog.length,
        log: test
        //log: JSON.parse(test)
      }

      
      //console.log(JSON.parse(exerciseLog));

      res.status(201).send(exerciseLog);
      // res.status(201).json(exerciseLog);
      //res.status(201).send(JSON.parse(exerciseLog))
    })
  })



app.all('*', (req, res) => {
  res.status(404).send("Error 404: Path or Route Not Found");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
