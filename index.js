const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const users = [];

function User(username, id) {
    this.username = username;
    this._id = id;
    this.log = [];
}

users.push(new User('testUser', '0'))

app.use(cors())
app.use(express.static('public'))
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
});

app.route('/api/users')
    .get((req, res) => {
        res.json(users)
    })
    .post((req, res) => {
        const id = users.length
        const username = req.body.username
        users.push(new User(username, id))
        res.json({username: username, _id: id})
    })

app.post('/api/users/:_id/exercises', (req, res) => {
    const description = req.body.description;
    const duration = +req.body.duration;
    const date = req.body.date;
    const id = req.params._id;
    const user = users[id]
    if (!duration || !description){
        return res.json({error: 'missing parameters'})
    } else {
        let dateString;
        if (date) {
            dateString = new Date(date).toDateString()
        } else {
            dateString = new Date().toDateString()
        }

        user.log.push({description: description, duration: duration, date: dateString});
        user.count = user.log.length;
        res.json({
            username: user.username,
            description: description,
            duration: duration,
            date: dateString,
            _id: user._id
        })
    }
})

app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const user = await User.findById(userId).select("username log");

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let { from, to, limit } = req.query;

  let fromDate = from ? new Date(from) : new Date(0);
  let toDate = to ? new Date(to) : new Date();
  limit = limit ? parseInt(limit) : 0;

  user.log = user.log.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= fromDate && entryDate <= toDate;
  });

  if (limit > 0) {
    user.log = user.log.slice(0, limit);
  }

  // Formatear la propiedad de fecha en cada registro como una cadena en formato de fecha de la API de JavaScript
  user.log.forEach((entry) => {
    entry.date = new Date(entry.date).toDateString();
  });

  res.json({
    _id: user._id,
    username: user.username,
    count: user.log.length,
    log: user.log,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})