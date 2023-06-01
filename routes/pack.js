const express = require('express');
const firebase = require('firebase-admin');
const axios = require('axios');

var app = express();
var db = firebase.database();

app.post('/preference', (req, res) => {
  const requestedPackId = req.body.packId;
  db.ref(`packs/${requestedPackId}`).once('value', async (snapshot) => {
    const mercadopagoPreferenceId = snapshot.val().idMP;
    const preferenceResponse = await axios
      .get(
        `https://api.mercadopago.com/checkout/preferences/${mercadopagoPreferenceId}?access_token=${process.env.MP_ACCESS_TOKEN}`
      )
      .then((res) => {
        const packInfo = res.data.items;

        return { ok: true, packInfo: packInfo[0] };
      })
      .catch((err) => {
        return { ok: false, message: err };
      });

    if (preferenceResponse.ok) {
      const packBody = {
        ...preferenceResponse.packInfo,
        packPreferenceId: mercadopagoPreferenceId,
      };
      return res.status(200).json(packBody);
    }
    res.status(500).json({
      ...preferenceResponse.ok,
    });
  });
});

app.get('/active-packs', (req, res) => {
  db.ref('packs')
    .orderByChild('isActivePack')
    .equalTo(true)
    .once('value', (snapshot) => {
      const activePacks = snapshot.val();
      const activePacksList = Object.keys(activePacks).map((key) => ({
        ...activePacks[key],
        streamId: key,
      }));

      if (!activePacksList)
        return res.status(500).json({ message: 'No packs available' });

      return res.status(200).json(activePacksList);
    });
});

// Metodo POST para obtener datos de un usuario a partir de un email
app.post('/get-active-preferences', (req, res) => {
  db.ref('/packs')
    .orderByChild('isActivePack')
    .equalTo(true)
    .once('value', (snapshot) => {
      const packsObject = snapshot.val();
      if (packsObject) {
        const packsList = Object.keys(packsObject).map((key) => ({
          ...packsObject[key],
          uid: key,
        }));
        res.status(200).json(packsList);
      } else {
        res.status(500).json({
          message: 'Packs not found',
        });
      }
    });
});

module.exports = app;
