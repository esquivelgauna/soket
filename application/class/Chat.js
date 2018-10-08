const fs = require('fs');
class Chat {
    constructor(idChat) {
        this.id = idChat;
        this.files = {};
        this.tempFiles = {};
    }
    deleteFile(fileName) {
        return new Promise((resolve, reject) => {
            if (this.tempFiles[fileName]) {
                fs.unlink(process.env.temp + '/' + this.tempFiles[fileName].path, function (err) {
                    if (err)reject(err);
                    console.log('Delete file uploaded', fileName);
                });
                delete this.tempFiles[fileName];
                resolve(1);
            } else {
                console.log("Delete only file slices");
                this.files[fileName].status = 0;
                resolve(1)
            }
        });
    }
}
module.exports = {
    Chat
}