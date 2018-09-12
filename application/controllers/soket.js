module.exports = function (server, session, sharedsession) {
	var io = require('socket.io')(server);
	var fs = require('fs');
	var mysql = require('../heplers/database');
	var model = require('../models/Mdl_WebSocket');
	var pathTemp = "./temp/";
	var users = {};
	var sockets = {};
	var random, fileBuffer;
	var files = {},
		struct = {
			name: null,
			type: null,
			size: 0,
			data: [],
			slice: 0,
			status: 1,
		};

	var ChatNiurons = {
		usuarios: {
			id: null,
			nombre: null,
			nickname: null,
			descripcion: null,

			amigos: {
				usuario1: {},
				ususario2: {}
			},
			inbox: {
				SendMessage: null,
				ReciveMessage: null,
				SendFiles: null,
			}
		}
	}
	io.use(sharedsession(session));

	io.on('connection', function (socket) {
		console.log('New user connected by WebSockets \n');

		socket.on('Login', function (data) {
			console.log(data);
			model.Login(data.token, (result) => {
				if (result) {
					if (result.length == 1) {
						result = JSON.parse(JSON.stringify(result[0]));
						if (users[result.f_id_usuario] == null) {
							users[result.f_id_usuario] = {
								id: result.f_id_usuario,
								sid: socket.id,
								token: result.token
							}
							socket.handshake.session.userdata = result;
							socket.handshake.session.chats = {};
							socket.handshake.session.save();
							sockets[socket.id] = result['f_id_usuario'];
							console.log('No registered..\n');
						} else {
							users[result['f_id_usuario']].sid = socket.id;
							console.log('Ya regsitrado');
						}
						model.Chats(result['f_id_usuario'], (chats) => {
							if (chats) {
								socket.emit('chats', chats);
							}
						});
					}
				} else {
					console.log("User not registred!!..");
				}

			});
		});

		socket.on('Chat', (data) => {
			model.Messages(data.id, (messages) => {
				//console.log( messages );
				if (messages.length > 0) {
					socket.emit('Messages', messages);
				} else {
					socket.emit('Messages', []);
				}
			});
		});

		socket.on('NewChat', (data) => {
			// console.log(data);
			mysql.select({
				table: 'v_inbox2',
				conditions: {
					id_usuario: sockets[socket.id],
					receptor: data.id
				},
				show_query: true
			}, function (err, result) {
				if (result.length != 0) {
					socket.emit('NewChat', result[0]);
				}
			});

		});

		socket.on('ResetCounter', (data) => {
			console.log('ResetCounter');
			if (data.id, socket.handshake.session.userdata["f_id_usuario"]) {
				model.ResetCounter(data.id, socket.handshake.session.userdata["f_id_usuario"]);
			}
		});

		socket.on('Purchases', () => {
			console.log('Purchases .... ');
			model.Purchases(sockets[socket.id], (purchases) => {
				if (purchases.length != 0) {
					socket.emit('Purchases', purchases);
				} else {
					socket.emit('Purchases', {});
				}
			});


		});

		socket.on('Sales', (data) => {
			console.log('Sales .... ');
			model.Sales( sockets[socket.id] , (Sales)=>{
				if (Sales.length != 0) {
					socket.emit('Sales', Sales);
				} else {
					socket.emit('Sales', {});
				}
			});
		});

		socket.on('Sale', (data) => {
			console.log('Sale .... ', data);
			model.Sale(  sockets[socket.id], data.venta , (Sale)=>{
				if (Sale.length != 0) {
					socket.emit('Sale', Sale[0]);
				} else {
					socket.emit('Sale', {});
				}
			});
		});

		socket.on('message', function (data, archivos) {
			console.log(data);
			//transmitter, receiver, message, ip, files, callback 
			model.PrivateMessage(socket.handshake.session.userdata['f_id_usuario'], data.reciver, data.mensaje, socket.handshake.session.userdata['ip'], data.files, (query) => {
				console.log(data);
				let res;
				console.log(socket.handshake.session.chats[query.idInbox]);
				if (socket.handshake.session.chats[query.idInbox]) {
					if (socket.handshake.session.chats[query.idInbox].files) {
						console.log("tenemos archivos ");
						model.PutFiles(socket.handshake.session.chats[query.idInbox].files, query.idInbox, query.idMessage, (savedFiles) => {
							delete socket.handshake.session.chats[query.idInbox];
							console.log(savedFiles);
							res = {
								idChat: query.idInbox,
								idMessage: query.idMessage,
								message: data.mensaje,
								transmitter: socket.handshake.session.userdata['f_id_usuario'],
								files: savedFiles,
								date: new Date()
							}
							socket.emit('message', res);
							if (users[data.reciver] != undefined) {
								socket.broadcast.to(users[data.reciver].sid).emit('new message', res);
							}
						})
					};
				} else {
					console.log(" No Files: ", socket.handshake.session.chats);
					res = {
						idChat: query.idInbox,
						idMessage: query.idMessage,
						message: data.mensaje,
						transmitter: socket.handshake.session.userdata['f_id_usuario'],
						date: new Date(),
						files: {}
					}
					if (users[data.reciver] != undefined) {
						socket.broadcast.to(users[data.reciver].sid).emit('new message', res);
					}
					socket.emit('message', res);
				}
			});
		});
		socket.on('GetMessages', function (data) {
			if (data.message && data.chat) {
				model.GetMessages(data, (messages) => {
					socket.emit("SetMessages", {
						chat: data.chat,
						messages: messages
					});
					//console.log("Messages:",messages[0]);
				});
			}
		});

		socket.on('slice upload', (data) => {
			console.log("New slice file:", data.name);
			if (!socket.handshake.session.chats[data.chat]) {
				socket.handshake.session.chats[data.chat] = {};
				socket.handshake.session.chats[data.chat].id = data.chat;
				socket.handshake.session.chats[data.chat].files = {};
				socket.handshake.session.save();
			}
			if (!files[data.chat]) {
				files[data.chat] = {};
			}
			if (!files[data.chat][data.name]) {
				files[data.chat][data.name] = Object.assign({}, struct, data);
				files[data.chat][data.name].data = [];
			}
			if (files[data.chat][data.name].status == 1) {
				//convert the ArrayBuffer to Buffer 
				data.data = new Buffer(new Uint8Array(data.data));
				//save the data 
				files[data.chat][data.name].data.push(data.data);
				files[data.chat][data.name].slice++;
				if (files[data.chat][data.name].slice * 100000 >= files[data.chat][data.name].size) {
					//do something with the data
					fileBuffer = Buffer.concat(files[data.chat][data.name].data);
					//console.log(Math.random());
					random = Math.floor((Math.random() * 1000) + 1);
					let name = data.chat + "-" + random + "-" + data.name;

					fs.writeFile((pathTemp + name), fileBuffer, (err) => {
						socket.handshake.session.chats[data.chat].files[data.name] = {
							name: data.name,
							path: name,
							size: files[data.chat][data.name].size
						};
						//console.log('Archivos ', socket.handshake.session.chats);
						if (err) console.log(err);
						delete files[data.chat][data.name];
						if (err) return socket.emit('upload error');
						socket.emit('end upload');
					});

					console.log("Terminó de subirse el archivo:" + data.name);
					socket.emit('end upload');
				} else {

					socket.emit('request slice upload', {
						currentSlice: files[data.chat][data.name].slice,
						name: data.name,
						chat: data.chat
					});
				}
			} else {
				console.log("Delete in slices", data.name);
				delete files[data.chat][data.name];
			}
		});

		socket.on('delete file', (data) => {
			console.log(data);
			console.log(socket.handshake.session.chats[data.chat]);
			if (socket.handshake.session.chats[data.chat]) {
				if (socket.handshake.session.chats[data.chat].files[data.name]) {
					console.log("borraddo e n la sesion ");
					fs.unlink(pathTemp + socket.handshake.session.chats[data.chat].files[data.name].path, function (err) {
						if (err) return console.log(err);
						console.log('File deleted successfully', data.name);
						socket.emit('delete file', data);
						delete socket.handshake.session.chats[data.chat].files[data.name];
					});
				} else {
					console.log("Delete in temp files slices");
					files[data.chat][data.name].status = 0;
					socket.emit('delete file', data);
				}
			}
		});
		socket.on('disconnect', () => {
			delete users[sockets[socket.id]];
			delete sockets[socket.id];
		});
	});
	return io;
};