

var mysql = require('../heplers/database');
var fs = require('fs');
var pathTemp = "./Temp/";
var chatFolder = "./assets/uploads/chats/chat";

exports.Login = (tokenid, callback) => {
	mysql.select({
		table: 't_dat_online',
		conditions: {
			token: tokenid
		},
		limit: 1,
		show_query: false
	}, (err, result) => {
		if (err) return console.log(err);
		callback(result);
	});
}
exports.Chats = (id, callback) => {
	mysql.select({
		table: 'v_inbox2',
		conditions: {
			id_usuario: id //result[0]['f_id_usuario']
		},
		show_query: false
	}, function (err, result) {
		if (err) return console.log(err);
		callback(result);
	});
}
exports.Messages = (id, callback) => {
	mysql.native_query({
		query: 'SELECT f_id_usuario AS id_usuario, id_mensaje AS id  ,mensaje,fecha_msj, files FROM (SELECT * FROM t_dat_mensajes WHERE f_id_inbox = ' +
			id + ' ORDER BY id_mensaje DESC LIMIT 10 ) al ORDER BY id_mensaje ASC '
		//query: 'SELECT * FROM (t_dat_mensajes message INNER JOIN t_dat_files_message ffile ON (message.id_mensaje = ffile.f_id_message) ) WHERE message.f_id_inbox = '+id+' ORDER BY id_mensaje DESC LIMIT 10'

	}, (err, result) => {
		if (err) return console.log(err);
		//console.log(result);
		let cont = 0;
		let contFiles = 0;
		for (message in result) {
			if (result[message].files) {
				cont++;
			}
		}
		for (message in result) {
			if (result[message].files) {
				//console.log('Index:', message);
				(((index) => {
					mysql.select({
						table: 't_dat_files_message',
						conditions: {
							f_id_message: result[index].id
						},
						show_query: false
					}, (err, files) => {
						if (err) return console.log(err);
						contFiles++;
						result[index].files = files;
						console.log(contFiles, cont);
						//console.log( Object.keys(result).length );
						if (contFiles == cont) {
							console.log("All files in messages");
							callback(result);
						}
					});
				})(message));
			} else {
				callback(result);
			}
		}
	});

}
exports.PrivateMessage = (transmitter, receiver, message, ip, files, callback) => {
	this.GetInbox({
		transmitter: transmitter,
		receiver: receiver
	}, (inbox) => {
		if (inbox.length == 0) {
			this.CreateInbox(transmitter, receiver, (newInbox) => {
				if (newInbox) {
					this.PutMessage(newInbox, transmitter, message, ip, files, (idMessage) => {
						callback({
							idInbox: newInbox,
							idMessage: idMessage,
						});
					});
					this.UpdateConter(newInbox, "b", 1, "2");
				}
			});
		} else {
			this.PutMessage(inbox[0]["id_inbox"], transmitter, message, ip, files, (idMessage) => {
				callback({
					idInbox: inbox[0]["id_inbox"],
					idMessage: idMessage
				});
			});
			if (inbox[0]["f_id_usuario_a"] == transmitter) {
				this.UpdateConter(inbox[0]["id_inbox"], "b", (inbox[0]["sin_leer_b"] + 1));
			} else {
				this.UpdateConter(inbox[0]["id_inbox"], "a", (inbox[0]["sin_leer_a"] + 1));
			}
		}
	});
}
exports.GetInbox = (data, callback) => {
	if (data.idInbox) {
		mysql.select({
			table: 't_dat_inbox',
			conditions: {
				id_inbox: data.idInbox
			},
			show_query: true
		}, (err, result) => {
			if (err) return console.log(err);
			callback(result)
		});

	} else {
		mysql.native_query({
			query: `SELECT * FROM t_dat_inbox WHERE ( ( f_id_usuario_a = ${data.transmitter} and f_id_usuario_b = ${data.receiver} ) or ( f_id_usuario_a = ${data.receiver} and f_id_usuario_b =  ${data.transmitter} ) ) `
		}, function (err, result) {
			if (err) return console.log(err);
			callback(result)
		});
	}

}
exports.CreateInbox = (transmitter, receiver, callback) => {
	mysql.insert({
		table: 't_dat_inbox',
		details: {
			f_id_usuario_a: transmitter,
			f_id_usuario_b: receiver,
			fecha_creacion: new Date(),
			fecha_ultimo_msj: new Date(),
			estatus: '0',
			sin_leer_b: 1
		},
		show_query: false
	}, function (err, result, inserted_id) {
		if (err) console.log(err);
		callback(inserted_id);
	});
}
exports.PutMessage = (idInbox, transmitter, message, ip, files, callback) => {
	mysql.insert({
		table: 't_dat_mensajes',
		details: {
			f_id_inbox: idInbox,
			f_id_usuario: transmitter,
			mensaje: message,
			fecha_msj: new Date(),
			files: files,
			ip: ip
		},
		show_query: false
	}, function (err, result, inserted_id) {
		if (err) return console.log(err);
		callback(inserted_id);
	});

}
exports.PutFiles = (files, idInbox, idMessage, callback) => {
	let count = 0;
	//data.map(function (chat, index) {
	for (index0 in files) {
		(((index) => {
			//console.log(index);
			let newPath = chatFolder + "-" + idInbox;
			if (!fs.existsSync(newPath)) {
				fs.mkdirSync(newPath);
			}
			newPath = newPath + "/" + files[index].path;
			//Move file
			fs.rename(pathTemp + files[index].path, newPath, (err) => {
				if (err) return console.log(err);
			});
			mysql.insert({
				table: 't_dat_files_message',
				details: {
					f_id_message: idMessage,
					path: files[index].path,
					name: files[index].name,
					size: files[index].size
				},
				show_query: false
			}, function (err, result, inserted_id) {
				if (err) return console.log(err);

				files[index].id = inserted_id;
				count++;
				if (count == Object.keys(files).length) {
					console.log("Files up");
					callback(files);
				}
			});
		})(index0));
	}
}

exports.ResetCounter = (idInbox, transmitter) => {
	this.GetInbox({
		idInbox: idInbox
	}, (inbox) => {
		if (inbox[0]["f_id_usuario_a"] == transmitter) {
			this.UpdateConter(idInbox, "a", 0);
		} else {
			this.UpdateConter(idInbox, "b", 0);
		}
	});
}
exports.UpdateConter = (idInbox, position, value) => {
	var query = {};
	query.conditions = {};
	query.details = {};

	query.conditions["id_inbox"] = idInbox;


	if (value > 0) {
		if (position == 'a') {
			query.details.sin_leer_a = value;
			query.details["estatus"] = "1";
		} else {
			query.details.sin_leer_b = value;
			query.details["estatus"] = "2";
		}
	} else {
		query.details["estatus"] = "0";
		if (position == 'a') {
			query.details.sin_leer_a = value;
		} else {
			query.details.sin_leer_b = value;
		}
	}
	mysql.update({
			table: 't_dat_inbox',
			details: query.details,
			conditions: query.conditions,
			show_query: true
		},
		function (err) {
			if (err) console.log(err);
		});
}