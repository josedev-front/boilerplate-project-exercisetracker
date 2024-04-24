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

app.route('/api/users/:_id/logs')
    .get((req, res) => {
        const id = req.params._id;
        const limit = Number(req.query.limit) || 0;
        const response = users[id];
        let newlog = response.log
        if (req.query.from && req.query.to) {
            const from = new Date(req.query.from).getTime();
            const to = new Date(req.query.to).getTime();
            newlog = newlog.filter(item => from <= new Date(item.date).getTime() <= to)}

        if (limit > 0){
            newlog = newlog.slice(0, limit)
        }
        response.log = newlog
        res.json(response)
    })

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})