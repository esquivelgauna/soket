module.exports = (socket, io) => {
	const Chats = require('../class/Chats').Chats;
	var chat = new Chats(); 
	var mysql = require('../heplers/database');
	var model = require('../models/Mdl_WebSocket');
	chat.io = io;
	console.log('Usuario:', socket.decoded_token.data.nombre);

	chat.newSocket(socket.id, socket.decoded_token.data);
	socket.on('Login', async (data, callback) => {
		let notyfi = await chat.login(socket.decoded_token.data.id, callback);
		//console.log( notyfi );
		callback(notyfi);
	});
	socket.on('Chats', (data, callback) => {
		chat.getChats(socket.decoded_token.data.id, callback);
	});
	socket.on('Chat', async (data, callback) => {
		let messages = await chat.getMessages(data.id);
		//console.log('esperando', messages);
		callback(messages);
	});
	socket.on('NewChat', (data) => {
		// console.log(data);
		mysql.select({
			table: 'v_inbox2',
			conditions: {
				id_usuario: socket.decoded_token.data.id,
				receptor: data.id
			},
			show_query: true
		}, function (err, result) {
			if (result.length != 0) {
				socket.emit('NewChat', result[0]);
			}
		});

	});
	socket.on('ResetCounter', (idChat, callback) => {
		console.log('ResetCounter', idChat);
		callback(true);
		// if (data.id, socket.decoded_token.data.id) {
		// 	callback(model.ResetCounter(data.id, socket.decoded_token.data.id));
		// }
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
		console.log(data);
		//transmitter, receiver, message, ip, files, callback 
		let message = await chat.privateMessage(socket.decoded_token.data.id, data.reciver, socket.id, data.mensaje, socket.handshake.address);
		if (message.ok) {
			console.log('My message', message);
			await callback(message);
		} else {
			console.log('No mm', message);
		}
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
		console.log("New slice file:", data.chat);
		let slice = chat.slice(socket.decoded_token.data.id, socket.id, data);
		//console.log(slice);
		switch (slice.status) {
			case 1:
				console.log("File end  upload");
				socket.emit('end upload');
				break;
			case 2:
				console.log("Slice Upload");
				// socket.emit('request slice upload',slice);
				callback(slice);
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

	});
}