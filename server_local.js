var express = require('express');
var request = require('request');
var player = require('./player');
var util = require('util');
var os = require('os');
var colors = require('colors');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


var port = process.env.PORT || 3000;


app.use(express.static(__dirname + "/dist/"));

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "trakt-api-key,trakt-api-version,");
  next();
 });

app.use('/proxy', function(req, res) {  
  var url = req.url.substring(1);

  console.log(colors.red("Proxy: ("+req.headers['user-agent']+")"),url)
  req.pipe(request(url)).pipe(res);
  console.log(colors.red("Proxy Done: "),url);
});

app.get('/', function(req, res){
    console.log(req.query.torrent)
    player.playTorrent(req.query.torrent, function(href){
        res.send(href);
        console.log("Ping: ", href);
    });
});

io.sockets.on('connection', function(ws) {
  
  console.log(colors.red("Socket connected!")," Total sockets: " + io.sockets.sockets.length);
  ws.emit("connected", function(res)
  {
    
  });

  ws.on('disconnect', function(msg) {
    console.log(msg);
    console.log('websocket connection close');
  });

  ws.on('debug', function(msg, res) {
    console.log(colors.green("TV debug: "),msg);
  });

  ws.on('log', function(data, res) {

    if (data.type == "string") {
      console.log(colors.green("TV log: "), data.msg);
    } else {
      obj = JSON.parse(data.msg);
      console.log(colors.green("TV log: "), util.inspect(obj, { showHidden: true, depth: 1, colors: true }));
    }

  });

  ws.on('warn', function(msg, res) {
    console.warn(colors.green("TV warn: "),msg);
  });

  ws.on('error', function(data, res) {
    console.log(colors.green("TV error: "),util.inspect(data, { showHidden: true, depth: 1, colors: true }));
  });

  ws.on('time', function(msg, res) {
    console.log(colors.magenta("TV Time: "),msg);
    console.time(msg);
  });

  ws.on('timeEnd', function(msg, res) {
    console.timeEnd(msg);
  });

});

server.listen(port);

console.log('Please go to http://localhost:' + port + ' to test your popcorntime');