var validate = require("validate.js");
const Mdl_Purchase = require('../models/Mdl_Purchase');
const Paypal = require('../class/Paypal').Paypal;
const paypal = new Paypal(process.env.client_id, process.env.client_secret);

module.exports = (socket, io) => {
    socket.on('Purchase', async (data, callblack) => {
        // console.log(data);

        var constraints = {
            id: {
                presence: true,
                exclusion: { 
                    message: "'%{value}' is not allowed"
                }
            },
            qty: {
                presence: true,
                exclusion: { 
                    message: "'%{value}' is not allowed"
                }
            },
            options: {
                presence: true
            },
            'options.idPack':{
                presence: true
            }
        };

        validate.async(data, constraints).then( async (success) => {
            console.log( 'Datos validados' , success );
            let trans = await Mdl_Purchase.checkOrder(success);
            let pay  = await paypal.purchaseLyf(trans.trans, socket.request.headers.origin);
            trans.order.idBuyer = socket.decoded_token.data.id;
            trans.order.idPaypal = pay.id;
            Mdl_Purchase.saveOrder(trans.order);
            
            console.log('Compras');
            console.log('Responde from paypal', pay);
            callblack({
                status: true,
                link: pay.linktopay
            })

        }, (error) => {
            console.log(error);
        });
    })

    socket.on('GetPurchases', async (data, callblack) => {
        
        let purchases = await Mdl_Purchase.getPurchases(socket.decoded_token.data.id);
        //console.log('Get Purchases ' ,purchases );
        callblack(purchases);

    });
 
}