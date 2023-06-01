const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const firebase = require('firebase-admin');

const app = express();
const dev = app.get('env') !== 'production';

const normalizePort = (port) => parseInt(port, 10);
const PORT = normalizePort(process.env.PORT || 5050);

// Cargo el dotenv mientras estoy en develop
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

/*PRODUCCION*/ if (!dev) {
  // Para simular AMBIENTE PRODUCCION
  // Descomentar la proxima linea y ejecutar $ NODE_ENV=production npm start
  require('dotenv').config();
  app.disable('x-powered-by');
  app.use(morgan('common'));

  app.use(express.static(path.resolve(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

/*DESARROLLO*/ if (dev) {
  app.use(morgan('dev'));
  // app.use(express.static(path.resolve(__dirname, '../client/build')));
  // app.get('/*', (req, res) => {
  //   res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  // });
}
// Body Parser (middleware para parsear el body en los POST)
// parse application/x-www-form-urlencoded
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

var corsOptions = {
  methods: 'GET,POST,DELETE',
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Configurar cabeceras y cors
// app.use(cors(corsOptions));
app.use(cors(corsOptions));

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  credential: firebase.credential.cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

// Importacion de rutas
var mpRoutes = require('./routes/mp');
var firebaseRoutes = require('./routes/firebase');
var packRoutes = require('./routes/pack');
var userRoutes = require('./routes/user');
var streamRoutes = require('./routes/stream');

// Rutas
app.use('/api/mp', mpRoutes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/pack', packRoutes);
app.use('/api/user', userRoutes);
app.use('/api/stream', streamRoutes);

// Escuchar peticiones en el puerto determinado
app.listen(PORT, () =>
  console.log(
    `Express server listening on port ${PORT}: \x1b[32m%s\x1b[0m`,
    'online'
  )
);
