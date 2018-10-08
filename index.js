
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var socketioJwt = require("socketio-jwt");
io.use(socketioJwt.authorize({
	secret: 'NvTfMrR',
	handshake: true
}));

require('./application/config/config');
io.sockets.on('connection', (socket) => {
	require('./application/controllers/chat')(socket, io);
	require('./application/controllers/purchases')(socket, io);
});













app.use('/static', express.static(__dirname + '/public'));
app.use('/chat', express.static(__dirname + '/assets/uploads/chats'));
app.get('/hello', function (req, res) {
	res.status(200).send("Hello World!");
});
app.get('/', function (req, res) {
	res.status(200).send("Bienvenido!!");
});

server.listen(process.env.PORT, function (err) {
	if (err) return console.log(err);
	console.log("Servidor corriendo en http://localhost:", process.env.PORT);
});