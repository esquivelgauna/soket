
var query_builder = require('query_builder');
var dbconn_default = {
	host: "niurons.com.mx",
	user: "niuronsc_Dev",
	dbase: "niuronsc_db_niurons",
	pass: "**niuronsdev2017"
};

// var dbconn_default = {
// 	host: "localhost",
// 	user: "root",
// 	dbase: "db_niurons",
// 	pass: ""
// };


module.exports = new query_builder(dbconn_default); 