// Importamos jsonwebtoken para verificar tokens JWT
const jwt = require("jsonwebtoken");

// Importamos el modelo Person para buscar el usuario autenticado
const Person = require("../models/person.model");

// Importamos el modelo Equipo para verificar maestros responsables
const Equipo = require("../models/equipo.model");

// ========== MIDDLEWARE 1: verificarToken ==========

/**
 * Verifica que la petición incluye un token JWT válido.
 *
 * Proceso:
 * 1. Extrae el token del header Authorization: Bearer <token>
 * 2. Verifica y decodifica el token
 * 3. Busca el usuario en la DB y lo adjunta a req.user
 * 4. Llama a next() si todo es correcto
 *
 * Uso en rutas:
 * router.get('/ruta-protegida', verificarToken, controlador)
 */
const verificarToken = async (req, res, next) => {
  try {
    // Extraemos el header Authorization de la petición
    const authHeader = req.headers.authorization;

    // Comprobamos que existe el header y que empieza con "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ mensaje: "Token no proporcionado" });
    }

    // Extraemos solo el token (quitamos el prefijo "Bearer ")
    const token = authHeader.split(" ")[1];

    // Verificamos y decodificamos el token con la clave secreta
    // jwt.verify lanza un error si el token es inválido o ha expirado
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      // Distinguimos entre token expirado y token inválido
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ mensaje: "Token expirado" });
      }
      return res.status(401).json({ mensaje: "Token inválido" });
    }

    // Buscamos el usuario en la DB usando el id guardado en el token
    // Si el usuario fue eliminado después de emitir el token, lo detectamos aquí
    const usuario = await Person.findById(payload.id);

    if (!usuario) {
      return res.status(401).json({ mensaje: "Token inválido: usuario no encontrado" });
    }

    // Adjuntamos el usuario completo a req.user para usarlo en los controladores
    req.user = usuario;

    // Continuamos con el siguiente middleware o controlador
    next();
  } catch (error) {
    console.error("Error en verificarToken:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// ========== MIDDLEWARE 2: verificarRol ==========

/**
 * Verifica que el usuario autenticado tiene uno de los roles permitidos.
 *
 * Es un middleware factory: recibe los roles permitidos y devuelve el middleware.
 * Debe usarse DESPUÉS de verificarToken (necesita req.user).
 *
 * @param {...String} roles - Roles permitidos (ej: 'Admin', 'Maestro')
 * @returns {Function} Middleware de Express
 *
 * Uso en rutas:
 * router.delete('/:id', verificarToken, verificarRol('Admin'), controlador)
 * router.put('/:id', verificarToken, verificarRol('Admin', 'Maestro'), controlador)
 */
const verificarRol = (...roles) => {
  return (req, res, next) => {
    // Comprobamos que req.user existe (debe haberse ejecutado verificarToken antes)
    if (!req.user) {
      return res.status(401).json({ mensaje: "Token no proporcionado" });
    }

    // Comprobamos si el rol del usuario está entre los roles permitidos
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        mensaje: "No tienes permisos para esta acción",
      });
    }

    // El usuario tiene el rol correcto, continuamos
    next();
  };
};

// ========== MIDDLEWARE 3: verificarMaestroResponsable ==========

/**
 * Verifica que el maestro autenticado es responsable del equipo que quiere modificar.
 *
 * Proceso:
 * 1. Obtiene el equipoId de req.params.id
 * 2. Busca el equipo en la DB
 * 3. Comprueba que el usuario autenticado está en maestrosResponsables del equipo
 *
 * Debe usarse DESPUÉS de verificarToken (necesita req.user).
 * Los Admins tienen acceso siempre (no se les aplica la restricción).
 *
 * Uso en rutas:
 * router.put('/:id', verificarToken, verificarMaestroResponsable, controlador)
 */
const verificarMaestroResponsable = async (req, res, next) => {
  try {
    // Los Admin pueden modificar cualquier equipo sin restricción
    if (req.user.rol === "Admin") {
      return next();
    }

    // Obtenemos el id del equipo de los parámetros de la ruta
    const equipoId = req.params.id;

    // Buscamos el equipo en la base de datos
    const equipo = await Equipo.findById(equipoId);

    if (!equipo) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    // Comprobamos si el usuario autenticado está en maestrosResponsables
    // Convertimos a string para comparar correctamente los ObjectId
    const esMaestroResponsable = equipo.maestrosResponsables.some(
      (maestroId) => maestroId.toString() === req.user._id.toString(),
    );

    if (!esMaestroResponsable) {
      return res.status(403).json({
        mensaje: "No eres maestro responsable de este equipo",
      });
    }

    // Es maestro responsable, continuamos
    next();
  } catch (error) {
    console.error("Error en verificarMaestroResponsable:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// ========== EXPORTACIONES ==========

module.exports = { verificarToken, verificarRol, verificarMaestroResponsable };
