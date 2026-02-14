// Importa Express, el framework para crear APIs
const express = require('express');

// Importa CORS (Cross-Origin Resource Sharing)
// Permite que tu frontend (Angular) en otro puerto/dominio haga peticiones a esta API
const cors = require('cors');

// Crea la aplicación Express
const app = express();

// ========== MIDDLEWARES ==========
// Los middlewares procesan las peticiones ANTES de llegar a las rutas

// CORS: Permite peticiones desde otros dominios (tu frontend Angular)
app.use(cors());

// express.json(): Permite que Express entienda JSON en el body de las peticiones
// Sin esto, req.body sería undefined cuando envíes datos JSON
app.use(express.json());

// express.urlencoded(): Permite entender datos de formularios HTML
// extended: true permite objetos y arrays anidados
app.use(express.urlencoded({ extended: true }));

// ========== RUTA DE PRUEBA ==========
// GET a la raíz (http://localhost:3000/)
// Sirve para verificar que la API está funcionando
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de GiConnect funcionando ✅',
    version: '1.0.0'
  });
});

// ========== RUTAS (comentadas por ahora) ==========
// Aquí iremos agregando las rutas de la API:
// app.use('/api/auth', require('./routes/auth.routes'));
// Esto significa: todas las rutas que empiecen con /api/auth
// se manejarán en el archivo routes/auth.routes.js

// Exporta la aplicación para usarla en server.js
module.exports = app;