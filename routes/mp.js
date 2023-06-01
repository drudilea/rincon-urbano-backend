const express = require('express');
const mercadopago = require('mercadopago');
const firebase = require('firebase-admin');

// ====================================
// Configuracion de MP
// ====================================

// Agrega credenciales de usuario de MP
mercadopago.configurations.setAccessToken(process.env.MP_ACCESS_TOKEN);

// Firebase References
var db = firebase.database();
var refPacks = db.ref('packs');
var refPayments = db.ref('payments');
var refUserPacks = db.ref('user-packs');
var app = express();

// ====================================
// API ENDPOINTS
// ====================================

app.get('/preference-info', (req, res) => {
  const preferenceRes = mercadopago.preferences
    .findById(req.query.id)
    .then(function (pref) {
      if (pref) {
        return res.status(200).json({ ok: true, prefrence: pref });
      }
    })
    .catch(function (error) {
      return res.status(500).json({ ok: false, message: error });
    });
});

app.post('/procesar_pago', async (req, res) => {
  // prettier-ignore
  const { uid, preference_id, token, installments, payment_method_id, email } = req.body;

  const preference = await mercadopago.preferences
    .findById(preference_id)
    .then(function (pref) {
      return pref;
    })
    .catch(function (error) {
      return error;
    });

  // prettier-ignore
  const { unit_price, description } = preference.body.items[0];

  const paymentData = {
    description,
    transaction_amount: unit_price,
    token,
    installments: parseInt(installments, 10),
    payment_method_id,
    payer: {
      email,
    },
    binary_mode: true,
  };

  mercadopago.payment
    .save(paymentData)
    .then(function (payment) {
      if (payment.body.status === 'approved') {
        try {
          refPacks
            .orderByChild('idMP')
            .equalTo(preference_id)
            .once('value', (snapshot) => {
              const packObject = snapshot.val();
              const packList = Object.keys(packObject).map((key) => ({
                ...packObject[key],
                packID: key,
              }));
              const newUserPack = {
                uid: uid,
                packID: packList[0].packID,
                streamsAvailable: packList[0].streamsAvailable,
                streamsLeft: packList[0].streamsAvailable,
                pricePerStream: packList[0].pricePerStream,
                purchaseID: payment.body.id,
                purchaseDate: firebase.database.ServerValue.TIMESTAMP,
                buyDateUTCString: new Date().toISOString(),
                expireDateUTCString: addMonthsToNow(1).toISOString(),
                valid: true,
              };
              refUserPacks.push(newUserPack);
            });
          refPayments.push(payment.body);
          res.redirect(`/payment-result?status=approved`);
        } catch (e) {
          console.log('Error fetching Packs DB - MP-API', e);
          res.status(500);
        }
      } else {
        refPayments.push(payment.body);
        res.redirect(
          `/payment-result?status=rejected&status_detail=${payment.body.status_detail}`
        );
      }
    })
    .catch(function (error) {
      res.status(500).send({
        message: error.message,
      });
    });
});

app.post('/procesar-pago-mock', async (req, res) => {
  // prettier-ignore
  const { uid, preference_id, description, email } = req.body;

  const payment = {
    body: {
      binary_mode: true,
      captured: true,
      card: {
        cardholder: {
          identification: {
            number: '99999999',
            type: 'DNI',
          },
          name: 'APRO',
        },
        date_created: '2000-01-01:00:00.000-04:00',
        date_last_updated: '2000-01-01:00:00.000-04:00',
        expiration_month: 12,
        expiration_year: 2025,
        first_six_digits: '999999',
        last_four_digits: '9999',
      },
      collector_id: 250268533,
      corporation_id: 'true',
      coupon_amount: 0,
      currency_id: 'ARS',
      date_approved: '2000-01-01:00:00.000-04:00',
      date_created: '2000-01-01:00:00.000-04:00',
      date_last_updated: '2000-01-01:00:00.000-04:00',
      description: description,
      fee_details: [
        {
          amount: 0.21,
          fee_payer: 'collector',
          type: 'mercadopago_fee',
        },
      ],
      id: 28283342,
      installments: 1,
      integrator_id: 'true',
      issuer_id: '310',
      live_mode: false,
      money_release_date: '2000-01-01:00:00.000-04:00',
      operation_type: 'regular_payment',
      payer: {
        email: email,
        first_name: 'Pago agregado',
        id: '23054811',
        identification: {
          number: '32659430',
          type: 'DNI',
        },
        last_name: 'Pago agregado',
        phone: {
          area_code: '01',
          extension: '',
          number: '1111-1111',
        },
        type: 'registered',
      },
      payment_method_id: 'visa',
      payment_type_id: 'credit_card',
      platform_id: 'true',
      processing_mode: 'aggregator',
      shipping_amount: 0,
      statement_descriptor: 'RINCONURBANO',
      status: 'approved',
      status_detail: 'accredited',
      taxes_amount: 0,
      transaction_amount: 5,
      transaction_amount_refunded: 0,
      transaction_details: {
        installment_amount: 5,
        net_received_amount: 4.79,
        overpaid_amount: 0,
        total_paid_amount: 5,
      },
    },
  };

  try {
    refPacks
      .orderByChild('idMP')
      .equalTo(preference_id)
      .once('value', (snapshot) => {
        const packObject = snapshot.val();
        const packList = Object.keys(packObject).map((key) => ({
          ...packObject[key],
          packID: key,
        }));
        const newUserPack = {
          uid: uid,
          packID: packList[0].packID,
          streamsAvailable: packList[0].streamsAvailable,
          streamsLeft: packList[0].streamsAvailable,
          pricePerStream: packList[0].pricePerStream,
          purchaseID: payment.body.id,
          purchaseDate: firebase.database.ServerValue.TIMESTAMP,
          buyDateUTCString: new Date().toISOString(),
          expireDateUTCString: addMonthsToNow(1).toISOString(),
          valid: true,
        };
        refUserPacks.push(newUserPack);
      });
    refPayments.push(payment.body);
    res.status(200).send(payment.body);
  } catch (e) {
    console.log('Error fetching Packs DB - MP-API', e);
    res.status(500);
  }
});

function addMonthsToNow(months) {
  let date = new Date();
  const d = date.getDate();
  date.setMonth(date.getMonth() + months);
  if (date.getDate() != d) {
    date.setDate(0);
  }
  return date;
}

module.exports = app;
