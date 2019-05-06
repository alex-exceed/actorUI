const express = require('express');
const {scrape} = require('./crawler');
const app = express();
const bodyParser = require('body-parser')
app.use(bodyParser.json())

app.use('/apify_storage', express.static(__dirname + '/apify_storage'));
app.use('/assets', express.static(__dirname + '/assets'));

app.get('/', function(req, res) {
    res.sendfile('templates/index.html');
});

app.post('/scrape', function(req, res) {
    scrape(req.body.key, req.body.email)
    res.status(200).send({done: true});
});

app.listen(3000);