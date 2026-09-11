import * as Joi from "joi";

/**
 * Esquema de validación de las variables de entorno.
 *
 * ConfigModule lo ejecuta al arrancar la aplicación (ver app.module.ts) y hace que el
 * servidor falle inmediatamente con un mensaje claro si falta alguna variable obligatoria,
 * en vez de arrancar "a medias" y fallar más tarde de forma confusa (ej: al conectar a Mongo).
 */
export const envValidationSchema = Joi.object({
  // Entorno de ejecución: cambia comportamientos como el CORS (ver main.ts)
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  // Puerto donde escucha el servidor HTTP
  PORT: Joi.number().default(3000),

  // Connection string de MongoDB Atlas (misma base de datos que usa el backend Express actual)
  MONGO_URI: Joi.string().required(),

  // Clave secreta para firmar y verificar los tokens JWT
  JWT_SECRET: Joi.string().required(),

  // Duración de validez de los tokens JWT (ej: "7d")
  JWT_EXPIRES_IN: Joi.string().default("7d"),

  // Origen permitido para CORS en producción (ej: la URL del frontend Angular/Ionic desplegado)
  // Opcional: si no está definida, en desarrollo se permite cualquier origen (ver main.ts)
  FRONTEND_URL: Joi.string().uri().optional(),
});
