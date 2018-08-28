var express = require('express');
var session = require("express-session")({
	secret: "my-secret",
	resave: true,
	saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");

var app = express();
var server = require('http').Server(app);

const os = require('os');
let addres = os.networkInterfaces();
let keys = Object.keys(addres);
console.log(   keys[0], addres  );
console.log(  addres[keys[1]][0].address  );



require('./application/controllers/soket')(server ,session, sharedsession );

//app.use(express.static('public'));
app.use('/static', express.static(__dirname + '/public'));
app.use('/chat', express.static(__dirname + '/assets/uploads/chats'));

app.get('/hello', function (req, res) {
	res.status(200).send("Hello World!");
});

app.get('/', function (req, res) {
	res.status(200).send("Bienvenido!!");
});

server.listen(8080, function () {
	console.log("Servidor corriendo en http://localhost:8080");
});
