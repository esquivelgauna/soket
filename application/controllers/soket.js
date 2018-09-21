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
		console.log('Usuario:', socket.decoded_token.data.nombre);
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

		socket.on('Message', async (data, callback) => {
			//console.log(data);
			//transmitter, receiver, message, ip, files, callback 
			let message = await chat.privateMessage(socket.decoded_token.data.id, data.reciver, socket.id, data.mensaje, socket.handshake.address);
			if (message.ok) {
				console.log('My message', message);
				await callback(message);
				//delete message;
			} else {
				console.log('No mm', message);
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

		socket.on('slice upload', async (data, callback) => {
			console.log("New slice file:", data);
			let slice = chat.slice(socket.decoded_token.data.id, socket.id, data);
			switch (slice.status ) {
				case 1:
					console.log("File upload");
					socket.emit('end upload');
					break;
				case 2:
					console.log("Slice Upload");
					callback( slice );
					break;
				case 3:
					console.log("Delete Slices");
					break;
				default:
					console.log('Slice default');
					break;

			}
		});

		socket.on('delete file', (data) => {
			console.log(data);
			if (chat.deleteFile(socket.decoded_token.data.id, socket.id, data.chat, data.name)) {
				socket.emit('delete file', data);
			}
		});

		socket.on('disconnect', () => {
			chat.logout(socket.id, socket.decoded_token.data.id);

			delete users[sockets[socket.id]];
			delete sockets[socket.id];
		});

	});
	return io;
};