const fs = require('fs');

//==========Variables de entorno===============
//=============== PUERTO========================
process.env.PORT = process.env.PORT || 3000;
process.env.db_host = process.env.db_host || "localhost";
process.env.db_name = process.env.db_name || "db_niurons";
process.env.db_user = process.env.db_user || "root";
process.env.db_pass = process.env.db_pass || "";

console.log(process.env.PORT)
console.log(process.env.db_host)
console.log(process.env.db_name)
console.log(process.env.db_pass)
console.log(process.env.db_user)

//====Crear carpetas por defecto si no existen =====
const folders = {
    temp: {
        description: "Carpeta para guardar os archivos temporalmente",
        name: "temp"
    },
    files: {
        description: "Capreta para mover los archivos que se envian en el chat",
        name: "files"
    }
}
for (let index in folders) {
    if (!fs.existsSync( folders[index].name )  ) {
        fs.mkdirSync( folders[index].name );
    }
}

 