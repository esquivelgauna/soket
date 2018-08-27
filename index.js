var express = require('express');
var session = require("express-session")({
	secret: "my-secret",
	resave: true,
	saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

var app = express();
var server = require('http').Server(app);

require('./application/controllers/soket')(server ,session, sharedsession );

//app.use(express.static('public'));
app.use('/static', express.static(__dirname + '/public'));
app.use('/chat', express.static(__dirname + '/assets/uploads/chats'));

app.get('/hello', function (req, res) {
	res.status(200).send("Hello World!");
});

server.listen(3000, function () {
	console.log("Servidor corriendo en http://localhost:3000");
});
