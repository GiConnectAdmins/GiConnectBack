// Importa Mongoose, el ODM (Object Data Modeling) para MongoDB
// Facilita trabajar con MongoDB usando esquemas y modelos
const mongoose = require('mongoose');

// Función asíncrona para conectar a MongoDB Atlas
// async/await permite escribir código asíncrono de forma más limpia
const connectDB = async () => {
  try {
    // mongoose.connect() intenta conectarse a MongoDB
    // process.env.MONGO_URI es la connection string del archivo .env
    // await espera a que la conexión se complete antes de continuar
    await mongoose.connect(process.env.MONGO_URI);
    
    // Si la conexión es exitosa, muestra este mensaje
    console.log('✅ MongoDB Atlas conectado correctamente');
    
  } catch (error) {
    // Si hay un error (credenciales incorrectas, red caída, etc.)
    console.error('❌ Error conectando a MongoDB:', error.message);
    
    // process.exit(1) termina la aplicación con código de error
    // Si no puede conectar a la DB, no tiene sentido seguir corriendo
    process.exit(1);
  }
};

// Exporta la función para usarla en server.js
module.exports = connectDB;