const express = require('express');
const firebase = require('firebase-admin');

var app = express();
var db = firebase.database();

app.post('/get-teachers', (req, res) => {
  db.ref('/users')
    .orderByChild(`roles/TEACHER_ROLE`)
    .equalTo('TEACHER_ROLE')
    .once('value', async (snapshot) => {
      let teachersList;
      const teachersObject = snapshot.val();
      if (teachersObject) {
        teachersList = Object.keys(teachersObject).map((key) => ({
          ...teachersObject[key],
          uid: key,
        }));
        return res.status(200).json(teachersList);
      } else {
        res.status(500).json({ message: 'Failed fetching teachers' });
      }
    });
});

// Metodo POST para obtener datos de un usuario
app.post('/user-info', (req, res) => {
  const user = req.query.user;
  db.ref(`/users/${user}`).once('value', (snapshot) => {
    let userInfoObject = snapshot.val();
    if (userInfoObject) {
      userInfoObject = {
        ...userInfoObject,
        uid: user,
      };
      res.status(200).json(userInfoObject);
    } else {
      res.status(500).json({
        message: 'User not found',
      });
    }
  });
});

// Metodo POST para obtener datos de un usuario a partir de un email
app.post('/user-info-email', (req, res) => {
  const userEmail = req.body.email;
  db.ref('/users')
    .orderByChild('email')
    .equalTo(userEmail)
    .once('value', async (snapshot) => {
      let userInfo;
      const userInfoObject = snapshot.val();
      if (userInfoObject) {
        userInfo = Object.keys(userInfoObject).map((key) => ({
          ...userInfoObject[key],
          pid: key,
        }));
        res.status(200).json(userInfoObject);
      } else {
        res.status(500).json({
          message: 'User not found',
        });
      }
    });
});

app.post('/all-users', (req, res) => {
  db.ref('/users').once('value', async (snapshot) => {
    let usersList;
    const usersObject = snapshot.val();
    if (usersObject) {
      usersList = Object.keys(usersObject).map((key) => ({
        ...usersObject[key],
        uid: key,
      }));
      return res.status(200).json(usersList);
    } else {
      res.status(500).json({ message: 'Failed fetching users' });
    }
  });
});

module.exports = app;
