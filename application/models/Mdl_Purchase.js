const mysql = require('../heplers/database');

exports.getLyf = (idLyf) => {
	return new Promise((resolve, reject) => {
		mysql.select({
			table: 't_dat_lyf',
			conditions: {
				id_lyf: idLyf
			},
			limit: 1,
			show_query: false
		}, (err, result) => {
			if (err) reject(err);
			resolve(result[0]);
		});
	});

}
exports.getPacket = (idLyf, idPack) => {
	return new Promise((resolve, reject) => {
		mysql.select({
			table: 't_dat_paquetes',
			conditions: {
				f_id_tipopaquete: idPack,
				f_id_lyf: idLyf
			},
			limit: 1,
			show_query: false
		}, (err, result) => {
			if (err) reject(err);
			resolve(result[0]);
		});
	});

}
exports.getPurchases = (id) => {
	return new Promise((resolve, reject  )=>{
		mysql.select({
			table: 'v_orden',
			conditions: {
				comprador: id
			},
			show_query: false
		}, function (err, result) {
			if(err) reject(err);
			resolve(result);
		});
	})
}
//Id lif , amount
//Ids extras , amount
exports.checkOrder = async (data) => {
	//Datos validados { id: '6', qty: 1, options: { idPack: '1' } }
	return new Promise(async (resolve, reject) => {
		let lyf = await this.getLyf(data.id);
		let packet = await this.getPacket(data.id, data.options.idPack);
		let trans = {
			trans: [{
				"item_list": {
					"items": [{
						"name": lyf.titulo,
						"sku": lyf.id_lyf,
						"price": packet.costo,
						"currency": "USD",
						"quantity": data.qty
					}, ]
				},
				"amount": {
					"currency": "USD",
					"total": (data.qty * packet.costo)
				},
				"description": packet.descripcion
			}],
			order:{
				idSeller: lyf.f_id_usuario,
				idPacket: packet.id_paquete,
				total: (data.qty * packet.costo)
			},
		}
		// console.log( lyf );
		console.log(trans);
		resolve(trans);
	});

}

exports.saveOrder = async (data) => {
	//ibBuyer, idSeller, idPaypal
	console.log(data);
	mysql.insert({
		table: 't_dat_orden',
		details: {
			f_id_paquete: data.idPacket,
			costo_total: data.total,
			fecha_creacion: new Date(),
			f_id_comprador: data.idBuyer,
			f_id_vendedor: data.idSeller,
			f_id_paypal: data.idPaypal
		},
		show_query: false
	}, function (err, result, inserted_id) {
		if (err) console.log(err);
		console.log( 'Compra realizada con exito' ,  inserted_id);
	});
}