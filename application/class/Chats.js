const mysql = require('../heplers/database');
const fs = require('fs');
const path = require('path');
const Chat = require('./Chat').Chat;
const User = require('./User').User;
const Socket = require('./Socket').Socket;
const {
    File
} = require('./File');

class Chats {
    constructor() {
        this.usersOnline = {};
        this.socket;
        this.io;
    }

    newSocket(idSocket, data) {
        //console.log(idSocket, data);
        if (!this.usersOnline[data.id]) {
            this.usersOnline[data.id] = new User(data.id, data.nombre);
            this.usersOnline[data.id].sockets[idSocket] = new Socket(idSocket);
        } else {
            if (!this.usersOnline[data.id].sockets[idSocket]) {
                this.usersOnline[data.id].sockets[idSocket] = new Socket(idSocket);
            }
        }
        //console.log(this.usersOnline);
    }
    async login(idUser) {
        return new Promise((resolve, reject) => {
            mysql.native_query({
                query: "CALL s_messages_notify( 0, " + idUser + ", 1 )"
            }, (err, result) => {
                if (err) reject(err);
                resolve(result[0]);
            });
        })

    }
    logout(idSocket, idUser) {
        // console.log(this.usersOnline[idUser]);
        console.log('\n', this.usersOnline)
        delete this.usersOnline[idUser].sockets[idSocket];
    }



    getMessages(idInbox) {
        return new Promise((resolve, reject) => {
            mysql.native_query({
                query: 'SELECT f_id_usuario AS id_usuario, id_mensaje AS id  ,mensaje,fecha_msj, files FROM (SELECT * FROM t_dat_mensajes WHERE f_id_inbox = ' +
                    idInbox + ' ORDER BY id_mensaje DESC LIMIT 10 ) al ORDER BY id_mensaje ASC '
            }, async (err, result) => {
                if (err) reject(err);
                resolve(await this.getFiles(result));
            });
        });
    }
    getFiles(messages) {
        return new Promise((resolve, reject) => {
            //console.log(messages)
            messages = messages;
            let files = 0;
            let contFiles = 0;
            for (let message in messages) {
                if (messages[message].files) {
                    files++;
                }
            }
            if (files > 0) {
                console.log('Load Files');
                for (let message in messages) {
                    if (messages[message].files) {
                        (((index) => {
                            mysql.select({
                                table: 't_dat_files_message',
                                conditions: {
                                    f_id_message: messages[index].id
                                },
                                show_query: false
                            }, async (err, messageFiles) => {
                                if (err) reject(err);
                                contFiles++;
                                messages[index].files = messageFiles;
                                if (contFiles == files) {
                                    console.log("All files");
                                    resolve(messages);
                                }
                            });
                        })(message));
                    }
                }
            } else {
                console.log("No Files");
                resolve(messages);
            }
        });


    }
    getChats(idUser, callback) {
        mysql.select({
            table: 'v_inbox2',
            conditions: {
                id_usuario: idUser
            },
            show_query: false
        }, (err, result) => {
            if (err) throw console.log(err);
            callback(result);
        });
    }
    getSale(idSeller, idSale, callback) {
        mysql.select({
            table: 'v_orden',
            conditions: {
                vendedor: idSeller,
                orden: idSale
            },
            show_query: true
        }, function (err, result) {
            if (err) throw err;
            callback(result[0]);
        });
    }
    getSales(idSeller, callback) {
        mysql.select({
            table: 'v_orden',
            conditions: {
                vendedor: idSeller
            },
            show_query: true
        }, function (err, result) {
            callback(result);
        });
    }

    async privateMessage(idTransmitter, idReceiver, idSocket, mymessage, ip) {
        let chat = await this.getInbox({
            transmitter: idTransmitter,
            receiver: idReceiver
        });
        console.log(chat);
        if (!chat) {
            chat["id_inbox"] = await this.createInbox(idTransmitter, idReceiver);
        } else {
            if (chat["f_id_usuario_a"] == idTransmitter) {
                this.updateConter(chat["id_inbox"], "b", (chat["sin_leer_b"] + 1));
            } else {
                this.updateConter(chat["id_inbox"], "a", (chat["sin_leer_a"] + 1));
            }
        }
        let files = await this.checkFiles(idTransmitter, idSocket, chat["id_inbox"]);
        if (files.ok) {
            console.log(files);
            let message = await this.putMessage(chat["id_inbox"], idTransmitter, mymessage, ip, files);
            message.ok = true;
            message.date = new Date();
            message.transmitter = idTransmitter;
            if (files.files) {
                message.files = await this.insertFiles(files.files, chat['id_inbox'], message.idMessage);
            } else {
                message.files = null;
            }
            this.notifyMessage(idReceiver, message);
            console.log();
            delete this.usersOnline[idTransmitter].sockets[idSocket].chats[chat['id_inbox']];
            return message;
        } else {
            return {
                ok: false,
                message: files.message
            };
        }
    }
    getInbox(data) {
        return new Promise((resolve, reject) => {
            if (data.idInbox) {
                mysql.select({
                    table: 't_dat_inbox',
                    conditions: {
                        id_inbox: data.idInbox
                    },
                    show_query: true
                }, async (err, result) => {
                    if (err) reject(err);
                    resolve(result);
                });

            } else {
                mysql.native_query({
                    query: `SELECT * FROM t_dat_inbox WHERE ( ( f_id_usuario_a = ${data.transmitter} and f_id_usuario_b = ${data.receiver} ) or ( f_id_usuario_a = ${data.receiver} and f_id_usuario_b =  ${data.transmitter} ) ) `
                }, async (err, result) => {
                    if (err) reject(err);
                    //console.log(result[0].id_inbox);
                    if (result.length) {
                        resolve(result[0]);
                    } else {
                        resolve(null);
                    }
                });
            }
        });

    }
    createInbox(transmitter, receiver) {
        return new Promise((resolve, reject) => {
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
                if (err) reject(err)
                resolve(inserted_id);
            });
        });

    }
    putMessage(idInbox, transmitter, message, ip, files) {
        return new Promise((resolve, reject) => {
            if (files.files) {
                files = 1;
            } else {
                files = 0;
            }
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
                console.log('ID Message', inserted_id);
                if (err) reject(err);
                resolve({
                    message,
                    idChat: idInbox,
                    idMessage: inserted_id
                });
            });
        });

    }
    updateConter(idInbox, position, value) {
        let query = {};
        query.conditions = {};
        query.details = {};
        query.conditions["id_inbox"] = idInbox;
        // query.details.
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
    checkFiles(idUser, idSocket, idChat) {
        if (this.usersOnline[idUser].sockets[idSocket].chats[idChat]) {
            let chat = this.usersOnline[idUser].sockets[idSocket].chats[idChat];
            if (Object.keys(chat.files).length > 0) {
                return {
                    ok: false,
                    files: null,
                    message: 'Files uploading'
                }
            } else {
                if (Object.keys(chat.tempFiles).length > 0) {
                    //delete this.usersOnline[idUser].sockets[idSocket].chats[idChat].tempFiles;
                    return {
                        ok: true,
                        files: chat.tempFiles,
                        message: 'Files UP'
                    }
                } else {
                    return {
                        ok: true,
                        files: null,
                        message: 'No Files'
                    }
                }
            }
        } else {
            return {
                ok: true,
                files: null,
                message: 'No Files'
            }
        }
    }
    insertFiles(files, idInbox, idMessage) {
        return new Promise((resolve, reject) => {
            let count = 0;
            for (let index0 in files) {
                (((index) => {
                    let chatFiles = process.env.chatFiles + "-" + idInbox;
                    if (!fs.existsSync(path.resolve(process.env.files, chatFiles))) {
                        fs.mkdirSync(path.resolve(process.env.files, chatFiles));
                    }
                    let newPath = process.env.files + "/" + chatFiles + "/" + files[index].path;
                    fs.rename(process.env.temp + "/" + files[index].path, newPath, (err) => {
                        if (err) reject(err);
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
                        if (err) reject(err);

                        files[index].id = inserted_id;
                        count++;
                        if (count == Object.keys(files).length) {
                            console.log("Files up");
                            resolve(files);
                        }
                    });
                })(index0));
            }
        });
    }
    slice(iduser, idSocket, data) {
        //if  chat doesnt exsist
        if (!this.usersOnline[iduser].sockets[idSocket].chats[data.chat]) {
            this.usersOnline[iduser].sockets[idSocket].chats[data.chat] = new Chat(data.chat);;
            // this.usersOnline[iduser].sockets[idSocket].chats[data.chat].id = data.chat;
            // this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files = {};
            // this.usersOnline[iduser].sockets[idSocket].chats[data.chat].tempFiles = {};
        }
        //if file doesnt exsist 
        if (!this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name]) {
            this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name] = new File(data);
        }
        //if file is active
        if (this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].status == 1) {
            //convert the ArrayBuffer to Buffer 
            data.data = new Buffer(new Uint8Array(data.data));
            //save the data 
            this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].data.push(data.data);
            this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].slice++;
            if (this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].slice * 100000 >= this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].size) {
                //do something with the data
                let fileBuffer = Buffer.concat(this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].data);
                let random = Math.floor((Math.random() * 1000) + 1);
                let name = data.chat + "-" + random + "-" + data.name;

                fs.writeFile((process.env.temp + "/" + name), fileBuffer, (err) => {
                    this.usersOnline[iduser].sockets[idSocket].chats[data.chat].tempFiles[data.name] = {
                        name: data.name,
                        path: name,
                        size: data.size
                    }
                    if (err) console.log(err);
                    delete this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name];
                });
                return {
                    status: 1,
                    name: data.name,
                    chat: data.chat
                };
            } else {
                return {
                    status: 2,
                    currentSlice: this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name].slice,
                    name: data.name,
                    chat: data.chat
                };
            }
        } else {
            //Delete slices
            console.log("Delete in slices", data.name);
            delete this.usersOnline[iduser].sockets[idSocket].chats[data.chat].files[data.name];
            return {
                status: 3,
                name: data.name,
                chat: data.chat
            };
        }

    }
    notifyMessage(idUser, message) {
        message.type = 'message';
        if (this.usersOnline[idUser]) {

            for (let socket in this.usersOnline[idUser].sockets) {
                console.log('socket', socket);
                this.io.to(socket).emit('Notify', message);
            }

            //return this.usersOnline[idUser].sockets;
        } else {
            //return null;
        }


    }
    notification(data, type) {
        let notify = {
            id: null,
            type: null,
            title: null,
            status: null,
            img: null,
            link: null,
        }
        switch (type) {
            case "message":
                break;
            case 'notification':
                break;
            default:
                console.log(" No fund type");
                break;
        }

    }
    async deleteFile(iduser, idSocket, idChat, nameFile) {
        //Delete file 
        //console.log('chats', this.usersOnline[iduser].sockets[idSocket].chats[idChat]);
        return await this.usersOnline[iduser].sockets[idSocket].chats[idChat].deleteFile(nameFile);
    }
}

module.exports = {
    Chats
}