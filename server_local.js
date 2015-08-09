var express = require('express');
var request = require('request');
var player = require('./player');
var os = require('os');

var app = express();
var port = process.env.PORT || 8001;

app.use(express.static(__dirname + "/dist/"));

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

app.use('/proxy', function(req, res) {  
  var url = req.url.substring(1);
  console.log("Request: "+url)
  req.pipe(request(url)).pipe(res);
});

app.get('/', function(req, res){
    console.log(req.query.torrent)
    player.playTorrent(req.query.torrent, function(href){
        res.send(href);
        console.log("Ping: ", href);
    });
});

app.listen(port);

console.log('Please go to http://localhost:' + port + ' to test your popcorntime');