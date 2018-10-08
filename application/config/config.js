const fs = require('fs');
const path = require('path');
//PayPal 
process.env.client_id =  process.env.client_id || 'ASnNvJukwWF8CyzqcrIwJNmzxyt7JZ5NWq7D0fkPGEFFqScndVjaK8sxAZqNHKxBDJK-n36Q9dH8y0O6' ;
process.env.client_secret = process.env.client_secret || 'ELqheDq9lgrf69MaXojBXOq7Lyuhyf89HCtaHCe9YYo70ZZRNn-SpyLuzjy9QPjUP6SGVzuNuQhwkzBc' ; 
//==========Variables de entorno================
//=============== PUERTO =======================
process.env.PORT = process.env.PORT || 3000;
//============== DATA BASE =====================
process.env.db_host = process.env.db_host || "localhost";
process.env.db_name = process.env.db_name || "db_niurons";
process.env.db_user = process.env.db_user || "root";
process.env.db_pass = process.env.db_pass || "";
console.log('Server Port:', process.env.PORT)
console.log('DB Host:', process.env.db_host)
console.log('DB Name:', process.env.db_name)
//console.log('DB Password:', process.env.db_pass)
console.log('DB User:', process.env.db_user)
 
//============== Uploads =======================
process.env.chatFiles = process.env.chatFiles || "chatFiles";
const uploads = {
    description: "Carpeta de carga",
    name: "uploads",
    folders: {
        temp: {
            description: "Carpeta para guardar os archivos temporalmente",
            name: "temp"
        },
        files: {
            description: "Capreta para mover los archivos que se envian en el chat",
            name: "files"
        }
    }
}
uploads.name = process.env.uploads || uploads.name;
//==== Create folders if does not exist  =====
for (let index in uploads.folders) {
    if (!fs.existsSync(path.resolve(uploads.name, uploads.folders[index].name))) {
        fs.mkdirSync(path.resolve(uploads.name, uploads.folders[index].name));
        process.env[index] = path.resolve(uploads.name, uploads.folders[index].name );
    } else {
        process.env[index] = path.resolve(uploads.name, uploads.folders[index].name );
    }
    console.log( index , process.env[index]);
}