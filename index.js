var express = require('express');
var session = require("express-session")({
	secret: "my-secret",
	resave: true,
	saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var mysql;
var app = express();
var server = require('http').Server(app);

const os = require('os').networkInterfaces();
let keys = Object.keys(os);
console.log(os[keys[1]][0].address);
let port  = 8080;
//Local
if (os[keys[1]][0].address == "::1") {
	port = 3000;
}
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