
var query_builder = require('query_builder');
var dbconn_default = {
	host: "108.179.194.22",
	user: "niuronsc_Dev",
	pass: "**niuronsdev2017",
	dbase: "niuronsc_db_niurons"
	
};

// var dbconn_default = {
// 	host: "localhost",
// 	user: "root",
// 	dbase: "db_niurons",
// 	pass: ""
// };


module.exports = new query_builder(dbconn_default); 