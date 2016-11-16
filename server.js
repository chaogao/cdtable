var express = require('express');
var path = require('path');
var app = new (require('express'))()
var port = 8082;
var fs = require('fs');

app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use('/libs', express.static(path.join(__dirname, 'libs')));

app.use('/api', function (req, res) {
  res.sendFile(__dirname + '/example/data.json');
});

app.use('/', function(req, res) {
  res.sendFile(__dirname + '/example/index.html')
})

app.listen(port, function(error) {
  if (error) {
    console.error(error)
  } else {
    console.info("==> 🌎  Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
  }
})
