var query_builder = require('query_builder');
//Local 
database = {
	host: process.env.db_host,
	user: process.env.db_user,
	dbase: process.env.db_name,
	pass: process.env.db_pass
};
module.exports = new query_builder(database);