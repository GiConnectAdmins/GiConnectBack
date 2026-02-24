// ========== IMPORTACIONES ==========
// Express Router nos permite definir rutas de forma modular
const express = require("express");
const router = express.Router();

// Importamos todos los métodos del controlador de BeltDate
const beltDateController = require("../controllers/beltdate.controller");

// ========== DEFINICIÓN DE RUTAS ==========

/**
 * GET /api/beltdates
 *
 * Obtiene todos los registros de concesión de cinturones
 * Ordenados por fecha de creación descendente (más reciente primero)
 * Incluye los datos del cinturón poblados (color y grado)
 *
 * Ejemplo:
 * - GET /api/beltdates
 */
router.get("/", beltDateController.getAll);

/**
 * GET /api/beltdates/:id
 *
 * Obtiene un registro específico por su ID
 * Incluye datos del cinturón (populated)
 *
 * Ejemplo:
 * - GET /api/beltdates/64f3a1b2c4d5e6f7a8b9c0d1
 */
router.get("/:id", beltDateController.getById);

/**
 * POST /api/beltdates
 *
 * Crea un nuevo registro de concesión de cinturón
 *
 * Body (JSON):
 * {
 *   "cinturon": "64f3a1b2..." (ObjectId del cinturón - obligatorio),
 *   "fecha": "2026-02-16" (opcional - si no se envía, usa fecha actual)
 * }
 *
 * Validaciones:
 * - cinturon debe existir en la base de datos
 * - fecha no puede ser futura
 * - si no se envía fecha, se usa la fecha actual
 *
 * Ejemplo 1 (con fecha):
 * {
 *   "cinturon": "64f3a1b2c4d5e6f7a8b9c0d1",
 *   "fecha": "2025-12-15"
 * }
 *
 * Ejemplo 2 (sin fecha - usa fecha actual):
 * {
 *   "cinturon": "64f3a1b2c4d5e6f7a8b9c0d1"
 * }
 */
router.post("/", beltDateController.create);

/**
 * PUT /api/beltdates/:id
 *
 * Actualiza un registro existente
 * Permite actualizar el cinturón y/o la fecha
 *
 * Body (JSON): al menos un campo debe ser enviado
 * {
 *   "cinturon": "64f3a1b2..." (opcional),
 *   "fecha": "2026-01-20" (opcional)
 * }
 *
 * Validaciones:
 * - Si se actualiza cinturon, debe existir en la DB
 * - Si se actualiza fecha, no puede ser futura
 * - Al menos uno de los dos campos debe ser enviado
 *
 * Ejemplo (actualizar solo fecha):
 * {
 *   "fecha": "2025-11-10"
 * }
 *
 * Ejemplo (actualizar cinturón y fecha):
 * {
 *   "cinturon": "64f3a1b2c4d5e6f7a8b9c0d1",
 *   "fecha": "2026-01-01"
 * }
 */
router.put("/:id", beltDateController.update);

/**
 * DELETE /api/beltdates/:id
 *
 * Elimina un registro de concesión de cinturón
 *
 * Ejemplo:
 * - DELETE /api/beltdates/64f3a1b2c4d5e6f7a8b9c0d1
 */
router.delete("/:id", beltDateController.remove);

// ========== EXPORTACIÓN ==========
// Exportamos el router para montarlo en app.js
module.exports = router;
