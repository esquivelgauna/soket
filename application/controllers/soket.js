module.exports = function (server, session, sharedsession) {
	const Chat = require('../class/Chat').Chat;
	var chat = new Chat();
	var socketioJwt = require("socketio-jwt");
	var io = require('socket.io')(server);
	var fs = require('fs');
	var mysql = require('../heplers/database');
	var model = require('../models/Mdl_WebSocket');
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
	io.use(sharedsession(session));

	io.use(socketioJwt.authorize({
		secret: 'NvTfMrR',
		handshake: true
	}));
	io.on('connection', function (socket) {
		//console.log('New user connected by WebSockets \n');
		console.log('Usuario:', socket.decoded_token.data.nombre );
		chat.login(socket.id, socket.decoded_token.data);

		socket.on('Login', (data) => {
			//console.log(dat 
			if (users[socket.decoded_token.data.id] == null) {
				users[socket.decoded_token.data.id] = {
					id: socket.decoded_token.data.id,
					sid: socket.id
				}
				socket.handshake.session.userdata = socket.decoded_token.data;
				socket.handshake.session.chats = {};
				socket.handshake.session.save();
				sockets[socket.id] = socket.decoded_token.data.id;
				//console.log('No registered..\n');
			} else {
				users[socket.decoded_token.data.id].sid = socket.id;
				console.log('Ya regsitrado');
			}
		});
		socket.on('Chats', (data, callback) => {
			chat.getChats(socket.decoded_token.data.id, callback);
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
			if (data.id, socket.decoded_token.data.id) {
				model.ResetCounter(data.id, socket.decoded_token.data.id);
			}
		});

		socket.on('Purchases', () => {
			console.log('Purchases .... ');
			model.Purchases(socket.decoded_token.data.id, (purchases) => {
				if (purchases.length != 0) {
					socket.emit('Purchases', purchases);
				} else {
					socket.emit('Purchases', {});
				}
			});


		});

		socket.on('Sales', (data, callback) => {
			console.log('Sales ....', data);
			chat.getSales(socket.decoded_token.data.id, callback);
		});

		socket.on('Sale', (data, callback) => {
			chat.getSale(socket.decoded_token.data.id, data.venta, callback);
			console.log('Sale .... ', data);
		});

		socket.on('Message', (data, callback) => {
			console.log(data);
			//transmitter, receiver, message, ip, files, callback 
			let idMessage = chat.sendPrivateMessage(socket.decoded_token.data.id, data.reciver, data.mensaje, socket.handshake.address, data.files);
			if (idMessage) {
				let res = {
					idChat: idMessage.idInbox,
					idMessage: idMessage.idMessage,
					message: data.mensaje,
					transmitter: socket.decoded_token.data.id,
					date: new Date(),
					files: {}
				}
				callback(res);
			}
			// model.PrivateMessage(socket.decoded_token.data.id, data.reciver, data.mensaje, socket.handshake.address, data.files, (query) => {
			// 	//console.log(socket);
			// 	let res;
			// 	//console.log(socket.handshake.session.chats[query.idInbox]);
			// 	if (socket.handshake.session.chats[query.idInbox]) {
			// 		if (socket.handshake.session.chats[query.idInbox].files) {
			// 			console.log("tenemos archivos ");
			// 			model.PutFiles(socket.handshake.session.chats[query.idInbox].files, query.idInbox, query.idMessage, (savedFiles) => {
			// 				delete socket.handshake.session.chats[query.idInbox];
			// 				console.log(savedFiles);
			// 				res = {
			// 					idChat: query.idInbox,
			// 					idMessage: query.idMessage,
			// 					message: data.mensaje,
			// 					transmitter: socket.decoded_token.data.id,
			// 					files: savedFiles,
			// 					date: new Date()
			// 				}
			// 				socket.emit('message', res);
			// 				if (users[data.reciver] != undefined) {
			// 					socket.broadcast.to(users[data.reciver].sid).emit('new message', res);
			// 				}
			// 			})
			// 		};
			// 	} else {
			// 		console.log(" No Files: ", socket.handshake.session.chats);
			// 		res = {
			// 			idChat: query.idInbox,
			// 			idMessage: query.idMessage,
			// 			message: data.mensaje,
			// 			transmitter: socket.handshake.session.userdata['f_id_usuario'],
			// 			date: new Date(),
			// 			files: {}
			// 		}
			// 		if (users[data.reciver] != undefined) {
			// 			socket.broadcast.to(users[data.reciver].sid).emit('new message', res);
			// 		}
			// 		socket.emit('message', res);
			// 	}
			// });
		});

		socket.on('GetMessages', function (data) {
			if (data.message && data.chat) {
				model.GetMessages(data, (messages) => {
					socket.emit("SetMessages", {
						chat: data.chat,
						messages: messages
					});
				});
			}
		});

		socket.on('slice upload', (data) => {
			console.log("New slice file:", data.name);
			//chat.slice( socket.decoded_token.data.id , socket.id , data.chat  );
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

					fs.writeFile((process.env.temp + "/" + name), fileBuffer, (err) => {
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

			chat.logout(socket.id , socket.decoded_token.data.id);

			delete users[sockets[socket.id]];
			delete sockets[socket.id];
		});

	});
	return io;
};