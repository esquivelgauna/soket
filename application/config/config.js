//==========Variables de entorno================


//=============== PUERTO========================
process.env.PORT    = process.env.PORT    || 3000;
process.env.db_host = process.env.db_host || "localhost";
process.env.db_name = process.env.db_name || "db_niurons" ;
process.env.db_user = process.env.db_user || "root";
process.env.db_pass = process.env.db_pass || "";

console.log( process.env.PORT)