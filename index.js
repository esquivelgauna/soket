var express = require('express');
var session = require("express-session")({
	secret: "my-secret",
	resave: true,
	saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var app = express();
var server = require('http').Server(app);
require('./application/config/config')
const port = process.env.PORT;

require('./application/controllers/soket')(server, session, sharedsession);


//app.use(express.static('public'));
app.use('/static', express.static(__dirname + '/public'));
app.use('/chat', express.static(__dirname + '/assets/uploads/chats'));
app.get('/hello', function (req, res) {
	res.status(200).send("Hello World!");
});
app.get('/', function (req, res) {
	res.status(200).send("Bienvenido!!");
});

server.listen(port, function (err) {
	if (err) return console.log(err);
	console.log("Servidor corriendo en http://localhost:" , port);
});