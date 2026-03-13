// Importamos Router de Express para definir las rutas
const { Router } = require("express");

// Importamos los métodos del controlador de autenticación
const { register, login } = require("../controllers/auth.controller");

// Creamos el router
const router = Router();

// ========== RUTAS DE AUTENTICACIÓN ==========

// POST /api/auth/register — Registrar nuevo usuario
// Pública: no requiere token (es el punto de entrada para nuevos usuarios)
router.post("/register", register);

// POST /api/auth/login — Iniciar sesión
// Pública: no requiere token (es el punto de entrada para usuarios existentes)
router.post("/login", login);

// ========== EXPORTACIÓN ==========

module.exports = router;
