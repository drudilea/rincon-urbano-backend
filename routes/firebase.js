const express = require('express');
const firebase = require('firebase-admin');

// ====================================
// Configuracion de API
// ====================================
var app = express();

// Firebase References
var db = firebase.database();
var auth = firebase.auth();
var refUserPacks = db.ref('user-packs');

// Metodo POST para verificar si puede acceder a una clase
app.post('/check-streamsLeft', (req, res) => {
  // Usuario pasado como query (?user=[uid])
  const user = req.query.user;
  const stream = req.query.stream;
  let response = {
    enterClass: null,
    freeDay: null,
    freeClass: null,
    freeClassesLeft: null,
    alreadyInClass: null,
  };

  try {
    db.ref(`streams/${stream}/objectUserPrice`)
      .orderByChild('user')
      .equalTo(user)
      .once('value', (snapshot) => {
        if (!snapshot.val()) {
          // Si llega aca es porque nunca entro a la clase
          // Pregunto si es dia gratis
          if (process.env.FREE_DAY === 'true') {
            response.enterClass = true;
            response.freeDay = true;
            res.status(200).json({ response });
          } else {
            // Pregunto por la clase gratis
            db.ref(`users/${user}`).once('value', (snapshot) => {
              const userObject = snapshot.val();
              if (userObject.freeClasses > 0) {
                response.enterClass = true;
                response.freeClass = true;
                response.freeClassesLeft = userObject.freeClasses - 1;
                res.status(200).json({ response });
              } else {
                // Pregunto por los packs disponibles
                refUserPacks
                  .orderByChild('uid')
                  .equalTo(user)
                  .once('value', (snapshot) => {
                    let userPackList;
                    const userPackObject = snapshot.val();
                    if (userPackObject) {
                      userPackList = Object.keys(userPackObject).map((key) => ({
                        ...userPackObject[key],
                        pid: key,
                      }));

                      // Obtengo los paquetes que tengan clases listas para usar
                      let userPackListWithStreams = getAllActivePacks(
                        userPackList
                      );

                      // Pregunto si tiene streams disponibles en sus packs
                      if (userPackListWithStreams.length) {
                        response.enterClass = true;
                        res.status(200).json({ response });
                      } else {
                        response.enterClass = false;
                        res.status(200).json({ response });
                      }
                    } else {
                      response.enterClass = false;
                      res.status(200).json({ response });
                    }
                  });
              }
            });
          }
        } else {
          // Ya esta en la clase
          response.alreadyInClass = true;
          response.enterClass = true;
          res.status(200).json({ response });
        }
      });
  } catch (e) {
    console.log('Error while Check-streamsLeft', e);
    res.status(500).send({ ok: false, errors: e });
  }
});

// Metodo POST para acceder a la clase
app.post('/enter-class', (req, res) => {
  // Ya comprobé que pueda ingresar y agrego al estudiante con el precio correspondiente al stream elegido
  const user = req.query.user;
  const stream = req.query.stream;
  let userInfo = {};
  let streamInfo;
  let message;

  try {
    // Obtengo todos los datos del usuario
    db.ref(`users/${user}`).once('value', (snapshot) => {
      userObject = snapshot.val();
      userInfo.fullName = `${userObject.firstName} ${userObject.lastName}`;
      userInfo.imgUrl = userObject.imgUrl;

      // Obtengo datos del stream para anexarlos al usuario
      db.ref(`streams/${stream}`).once('value', (snapshot) => {
        streamInfo = snapshot.val();

        // Pregunto por dia gratis
        if (process.env.FREE_DAY === 'true') {
          message = 'Dia gratis';
          db.ref(`streams/${stream}/objectUserPrice/${user}`).update({
            user,
            packUnitPrice: 0,
            userFullName: userInfo.fullName,
            userImgUrl: userInfo.imgUrl,
          });
          db.ref(`users/${user}/streamsTaken`).push({
            stream: stream,
            startDateTimeUTCString: streamInfo.startDateTimeUTCString,
            teacher: streamInfo.teacher,
          });
          res.status(201).send({ ok: true, user, source: message });
        } else {
          // Pregunto por la clase gratis
          db.ref(`users/${user}`).once('value', (snapshot) => {
            const userObject = snapshot.val();
            if (userObject.freeClasses > 0) {
              message = 'Clase gratis';
              // Resto una de las clases gratis
              db.ref(`users/${user}`).update({
                freeClasses: userObject.freeClasses - 1,
              });
              db.ref(`users/${user}/streamsTaken`).push({
                stream: stream,
                startDateTimeUTCString: streamInfo.startDateTimeUTCString,
                teacher: streamInfo.teacher,
              });
              db.ref(`streams/${stream}/objectUserPrice/${user}`).update({
                user,
                packUnitPrice: 0,
                userFullName: userInfo.fullName,
                userImgUrl: userInfo.imgUrl,
              });
              res.status(201).send({ ok: true, user, source: message });
            } else {
              // Resto una clase del pack del usuario
              refUserPacks
                .orderByChild('uid')
                .equalTo(user)
                .once('value', (snapshot) => {
                  let userPackList;
                  const userPackObject = snapshot.val();
                  if (userPackObject) {
                    userPackList = Object.keys(userPackObject).map((key) => ({
                      ...userPackObject[key],
                      pid: key,
                    }));

                    // Obtengo los paquetes que tengan clases listas para usar
                    let userPackListWithStreams = getAllActivePacks(
                      userPackList
                    );

                    // Ordeno por fecha de compra y me quedo con el más viejo
                    userPackListWithStreams.sort(comparePurchaseDate);
                    const oldestPackWithStreams = userPackListWithStreams[0];
                    const packID = oldestPackWithStreams.pid;
                    const packStreamsLeft = oldestPackWithStreams.streamsLeft;
                    const streamPrice = oldestPackWithStreams.pricePerStream;
                    message = `Saco del pack ${packID}, quedan ${
                      packStreamsLeft - 1
                    } streams disponibles`;

                    db.ref(`user-packs/${packID}`).update({
                      streamsLeft: packStreamsLeft - 1,
                    });
                    db.ref(`streams/${stream}/objectUserPrice/${user}`).update({
                      user,
                      packUnitPrice: streamPrice,
                      userFullName: userInfo.fullName,
                      userImgUrl: userInfo.imgUrl,
                    });
                    db.ref(`users/${user}/streamsTaken`).push({
                      stream: stream,
                      startDateTimeUTCString: streamInfo.startDateTimeUTCString,
                      teacher: streamInfo.teacher,
                    });
                    res.status(201).send({ ok: true, user, source: message });
                  }
                });
            }
          });
        }
      });
    });
  } catch (e) {
    console.log('Error while Enter-class', e);
    res.status(500).send({ ok: false, errors: e });
  }
});

// Metodo POST para obtener todos los packs VÁLIDOS de un usuario
app.post('/updated-user-packs', (req, res) => {
  const user = req.query.user;
  refUserPacks
    .orderByChild('uid')
    .equalTo(user)
    .once('value', (snapshot) => {
      let userPackList;
      const userPackObject = snapshot.val();
      if (userPackObject) {
        userPackList = Object.keys(userPackObject).map((key) => ({
          ...userPackObject[key],
          pid: key,
        }));

        // Obtengo los paquetes que tengan clases para usar y válidas
        let userPackListWithStreams = getAllActivePacks(userPackList);
        res.status(200).json(userPackListWithStreams);
      } else {
        res.status(500).json({ message: 'User not found' });
      }
    });
});

app.delete('/user', (req, res) => {
  // TODO: Implementar una verificacion del usuario que genera la peticion (seguridad)
  if (process.env.ACTIVE_USER_REMOVAL === 'true') {
    const uid = req.query.id;
    auth
      .deleteUser(uid)
      .then(() => {
        console.log('Successfully deleted user from auth');
        db.ref(`users/${uid}`).remove((err) => {
          if (err) {
            return res.status(500).json({
              ok: false,
              message: 'Error removing user from DB',
              errors: error,
            });
          }
          console.log('Successfully deleted user from DB');
          return res.status(200).json({ ok: true, message: 'User removed!' });
        });
      })
      .catch((error) => {
        console.log('Error removing user:', error);
        res.status(500).json({
          ok: false,
          message: 'Error removing user from Auth',
          errors: error,
        });
      });
  } else {
    res.status(401).send({ ok: false, message: 'Permission denied' });
  }
});

module.exports = app;

// ====================================
// Otras funciones usadas
// ====================================

// Compara los packs y los ordena por fecha de compra
function comparePurchaseDate(a, b) {
  let comparison = 0;
  if (a.purchaseDate > b.purchaseDate) {
    comparison = 1;
  } else if (a.purchaseDate < b.purchaseDate) {
    comparison = -1;
  }
  return comparison;
}

// Devuelve los packs listos para usar
function getAllActivePacks(userPackList) {
  if (!userPackList) {
    return [];
  }
  userPackListWithoutValidField = checkPacksWithoutValidField(userPackList);
  return userPackListWithoutValidField.concat(
    checkPacksWithValidField(userPackList)
  );
}

// Verifica si los packs que no tienen el campo "valid", tienen clases para usar
function checkPacksWithoutValidField(userPackList) {
  const userPackListWithoutValidField = userPackList.filter(function (pack) {
    return pack.valid === undefined && pack.streamsLeft > 0;
  });
  return userPackListWithoutValidField;
}

// Verifica que los packs tengan el campo "valid"
function checkPacksWithValidField(userPackList) {
  const userPackListWithValidField = userPackList.filter(function (pack) {
    return pack.valid == true;
  });
  return getUpToDatePacks(userPackListWithValidField);
}

// Actualiza la validez de los packs y devuelve una lista de los no vencidos con clases para usar
function getUpToDatePacks(userPackList) {
  today = new Date().toISOString();
  const userPackListUpToDate = userPackList.filter(function (pack) {
    if (pack.expireDateUTCString < today || pack.streamsLeft == 0) {
      updateExpiredUserPack(pack);
      return false;
    } else {
      return true;
    }
  });
  return userPackListUpToDate;
}

// Actualiza en base de datos el campo de validez a false
function updateExpiredUserPack(pack) {
  db.ref(`user-packs/${pack.pid}`).update({
    valid: false,
  });
}
