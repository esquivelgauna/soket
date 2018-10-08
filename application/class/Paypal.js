require('../config/config');
const ppapi = require('paypal-rest-sdk');


class Paypal {
    constructor( ) {
        this.client_id = process.env.client_id;
        this.client_secret = process.env.client_secret;
        ppapi.configure({
            'mode': 'sandbox', //sandbox or live
            'client_id': this.client_id,
            'client_secret': this.client_secret
        });
    }
    async purchaseLyf(transactions , origin ) {
        //console.log(this.client_id, this.client_secret);
        return new Promise((resolve, reject) => {
            const payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": origin+ "/Compras",
                    "cancel_url": origin+ "/Compras"
                },
                "transactions": transactions
            };
            ppapi.payment.create(payment_json, function (error, payment) {
                if (error) {
                    console.log('Error de Paypal', error.response);
                    reject(error.response);
                } else {
                    //console.log(payment);
                    // resolve(payment);
                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === 'approval_url') {
                            payment.linktopay = payment.links[i].href;
                            resolve(payment);
                        }
                    }
                }
            });
        });


    }
}
module.exports = {
    Paypal
}