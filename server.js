// Carga las variables de entorno del archivo .env
// Esto hace que process.env.PORT, process.env.MONGO_URI, etc. estén disponibles
require('dotenv').config();

// Importa la configuración de Express desde src/app.js
const app = require('./src/app');

// Importa la función que conecta a MongoDB desde src/config/database.js
const connectDB = require('./src/config/database');

// Define el puerto donde correrá el servidor
// Si existe PORT en .env lo usa, si no, usa 3000 por defecto
const PORT = process.env.PORT || 3000;

// Ejecuta la función que conecta a MongoDB Atlas
connectDB();

// Inicia el servidor y lo pone a escuchar en el puerto definido
// El callback se ejecuta cuando el servidor arranca correctamente
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});