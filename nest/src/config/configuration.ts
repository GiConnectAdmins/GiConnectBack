/**
 * Config tipada que se puede inyectar con ConfigService.get('nombre.campo').
 *
 * Es una capa fina sobre process.env: agrupa las variables relacionadas (ej. todo lo de JWT
 * bajo "jwt") para no repetir "process.env.XXX" suelto por todo el código.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT as string, 10) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL,
});
