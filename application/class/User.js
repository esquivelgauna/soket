class User{
    constructor( id, name ){
        this.id = id;
        this.name =  name;
        this.sockets =  {};
    }
}
module.exports = {
    User
}