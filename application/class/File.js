class File {
    constructor({
        name,
        type,
        size,
        data,
        chat
    }) {
        this.name = name;
        this.type = type;
        this.size = size;
        this.data = [];
        this.slice = 0;
        this.status = 1;
        this.chat = chat;
    }
}
module.exports = {
    File
}