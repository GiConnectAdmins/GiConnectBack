// Importa Express, el framework para crear APIs
const express = require("express");

// Importa CORS (Cross-Origin Resource Sharing)
// Permite que tu frontend (Angular) en otro puerto/dominio haga peticiones a esta API
const cors = require("cors");

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
app.get("/", (req, res) => {
  res.json({
    message: "API de GiConnect funcionando ✅",
    version: "1.0.0",
  });
});

// ========== RUTAS DE LA API ==========
// Aquí montamos todas las rutas de la aplicación
// Cada app.use() conecta un conjunto de rutas bajo un prefijo específico

// Rutas de Clases
// Todas las rutas que empiecen con /api/clases se manejan en clase.routes.js
// Ejemplos: GET /api/clases, POST /api/clases, GET /api/clases/:id, etc.
app.use("/api/clases", require("./routes/clase.routes"));

// Rutas de BeltDates (concesión de cinturones)
app.use("/api/beltdates", require("./routes/beltdate.routes"));

// Aquí irán más rutas según vayas creando controladores:
// app.use('/api/cinturones', require('./routes/cinturon.routes'));
// app.use('/api/equipos', require('./routes/equipo.routes'));
// app.use('/api/personas', require('./routes/person.routes'));
// app.use('/api/auth', require('./routes/auth.routes'));

// Exporta la aplicación para usarla en server.js
module.exports = app;
