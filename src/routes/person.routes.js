const express = require("express");
const router = express.Router();

const personController = require("../controllers/person.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

// ========== RUTAS ESTÁTICAS (deben ir ANTES que las paramétricas /:id) ==========
// Express evalúa rutas en orden. Si /:id fuera primero, la palabra "me" sería tratada como un ID.

// GET /api/personas/me — perfil propio (cualquier usuario autenticado)
router.get("/me", verificarToken, personController.getMe);

// PUT /api/personas/me/password — cambiar mi password (cualquier usuario autenticado)
router.put("/me/password", verificarToken, personController.cambiarPassword);

// PUT /api/personas/me — actualizar mi propio perfil (cualquier usuario autenticado)
router.put("/me", verificarToken, personController.updateMe);

// ========== RUTAS GENERALES ==========

// GET /api/personas — listar todas las personas (solo Admin)
router.get("/", verificarToken, verificarRol("Admin"), personController.getAll);

// ========== RUTAS PARAMÉTRICAS (van DESPUÉS de las estáticas) ==========

// GET /api/personas/:id — ver perfil por ID (Admin, compañeros de equipo, propio)
router.get("/:id", verificarToken, personController.getById);

// PUT /api/personas/:id/rol — cambiar rol (solo Admin)
// Va antes que /:id para que Express no confunda "rol" con otro parámetro
router.put("/:id/rol", verificarToken, verificarRol("Admin"), personController.cambiarRol);

// PUT /api/personas/:id — actualizar persona (Admin o Maestro sobre sus atletas)
router.put("/:id", verificarToken, personController.updateById);

// DELETE /api/personas/:id — eliminar persona (solo Admin)
router.delete("/:id", verificarToken, verificarRol("Admin"), personController.remove);

module.exports = router;
