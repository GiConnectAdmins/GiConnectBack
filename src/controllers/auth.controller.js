// Importamos el modelo Person para buscar/crear usuarios
const Person = require("../models/person.model");

// Importamos jsonwebtoken para crear y verificar tokens JWT
const jwt = require("jsonwebtoken");

// ========== FUNCIÓN AUXILIAR: GENERAR TOKEN JWT ==========

/**
 * Genera un token JWT con los datos del usuario
 *
 * @param {Object} usuario - Documento Person de MongoDB
 * @returns {String} Token JWT firmado
 */
const generarToken = (usuario) => {
  // El payload contiene los datos que se guardan dentro del token
  // NO incluir datos sensibles como password
  return jwt.sign(
    {
      id: usuario._id, // ID del usuario en MongoDB
      email: usuario.email, // Email del usuario
      rol: usuario.rol, // Rol: Admin, Maestro o Atleta
    },
    process.env.JWT_SECRET, // Clave secreta para firmar el token
    {
      expiresIn: process.env.JWT_EXPIRES_IN, // Duración del token (ej: '7d')
    },
  );
};

// ========== REGISTER: Registrar nuevo usuario ==========

/**
 * POST /api/auth/register
 *
 * Crea un nuevo usuario en la base de datos y devuelve un token JWT.
 * El password se hashea automáticamente en el pre-save del modelo Person.
 *
 * Body esperado: { nombre, apellidos, telefono, email, password, rol? }
 */
const register = async (req, res) => {
  try {
    // Extraemos los datos del body de la petición
    const { nombre, apellidos, telefono, email, password, rol } = req.body;

    // ===== VALIDACIÓN: Campos obligatorios =====
    if (!nombre || !apellidos || !telefono || !email || !password) {
      return res.status(400).json({
        mensaje: "Los campos nombre, apellidos, telefono, email y password son obligatorios",
      });
    }

    // ===== VALIDACIÓN: Email único =====
    // Comprobamos si ya existe un usuario con ese email
    const usuarioExistente = await Person.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({
        mensaje: "El email ya está registrado",
      });
    }

    // ===== CREAR USUARIO =====
    // Construimos el objeto con los datos del nuevo usuario
    // El password se hashea automáticamente en el middleware pre-save del modelo
    const nuevoUsuario = new Person({
      nombre,
      apellidos,
      telefono,
      email,
      password,
      rol: rol || "Atleta", // Si no se especifica rol, por defecto es Atleta
    });

    // Guardamos el usuario en la base de datos
    await nuevoUsuario.save();

    // ===== GENERAR TOKEN =====
    const token = generarToken(nuevoUsuario);

    // ===== RESPUESTA =====
    // Devolvemos el token y los datos del usuario SIN el password
    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      token,
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        apellidos: nuevoUsuario.apellidos,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
      },
    });
  } catch (error) {
    // Error de validación de Mongoose (ej: formato de email inválido, password débil)
    if (error.name === "ValidationError") {
      // Extraemos el primer mensaje de error de validación
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    // Error interno del servidor
    console.error("Error en register:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// ========== LOGIN: Iniciar sesión ==========

/**
 * POST /api/auth/login
 *
 * Verifica las credenciales del usuario y devuelve un token JWT si son correctas.
 *
 * Body esperado: { email, password }
 */
const login = async (req, res) => {
  try {
    // Extraemos email y password del body
    const { email, password } = req.body;

    // ===== VALIDACIÓN: Campos obligatorios =====
    if (!email || !password) {
      return res.status(400).json({
        mensaje: "Email y password son obligatorios",
      });
    }

    // ===== BUSCAR USUARIO =====
    // Usamos .select('+password') porque en el modelo el campo password
    // tiene select: false (no se devuelve por defecto en consultas)
    const usuario = await Person.findOne({ email }).select("+password");

    // Si el usuario no existe, devolvemos el mismo mensaje que si el password es incorrecto
    // Esto evita revelar si un email está registrado o no (seguridad)
    if (!usuario) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    // ===== VERIFICAR PASSWORD =====
    // Usamos el método compararPassword() definido en el modelo Person
    // que usa bcrypt.compare() internamente
    const passwordCorrecto = await usuario.compararPassword(password);

    if (!passwordCorrecto) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    // ===== GENERAR TOKEN =====
    const token = generarToken(usuario);

    // ===== RESPUESTA =====
    // Devolvemos el token y los datos del usuario SIN el password
    res.status(200).json({
      mensaje: "Login exitoso",
      token,
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    // Error interno del servidor
    console.error("Error en login:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
};

// ========== EXPORTACIONES ==========

module.exports = { register, login };
