// ========== IMPORTACIONES ==========
// Express Router nos permite definir rutas de forma modular
const express = require("express");
const router = express.Router();

// Importamos todos los métodos del controlador de Clase
const claseController = require("../controllers/clase.controller");

// ========== DEFINICIÓN DE RUTAS ==========

/**
 * GET /api/clases
 *
 * Obtiene todas las clases (con filtros opcionales)
 *
 * Query params opcionales:
 * - maestro: ID del maestro
 * - tipo: 'recurrente' o 'especial'
 * - titulo: búsqueda parcial por título
 *
 * Ejemplos:
 * - GET /api/clases
 * - GET /api/clases?maestro=64f3a1b2...
 * - GET /api/clases?tipo=recurrente
 * - GET /api/clases?titulo=Judo
 * - GET /api/clases?maestro=...&tipo=recurrente
 */
router.get("/", claseController.getAll);

/**
 * GET /api/clases/:id
 *
 * Obtiene una clase específica por su ID
 * Incluye datos del maestro (populated)
 *
 * Ejemplo:
 * - GET /api/clases/64f3a1b2c4d5e6f7a8b9c0d1
 */
router.get("/:id", claseController.getById);

/**
 * POST /api/clases
 *
 * Crea una nueva clase
 *
 * Body (JSON) para clase RECURRENTE:
 * {
 *   "titulo": "Judo Infantil",
 *   "tipo": "recurrente",
 *   "diaSemana": "Lunes",
 *   "hora": "18:00-19:30",
 *   "aforoMaximo": 20,
 *   "maestro": "64f3a1b2..."
 * }
 *
 * Body (JSON) para clase ESPECIAL:
 * {
 *   "titulo": "Seminario Defensa Personal",
 *   "tipo": "especial",
 *   "fecha": "2026-03-15",
 *   "hora": "10:00-11:30",
 *   "aforoMaximo": 30,
 *   "maestro": "64f3a1b2..."
 * }
 */
router.post("/", claseController.create);

/**
 * PUT /api/clases/:id
 *
 * Actualiza una clase existente
 *
 * Body (JSON): campos a actualizar
 * Nota: Si cambias el tipo, asegúrate de enviar los campos correspondientes
 *
 * Ejemplo (actualizar aforo):
 * {
 *   "aforoMaximo": 25
 * }
 *
 * Ejemplo (cambiar de recurrente a especial):
 * {
 *   "tipo": "especial",
 *   "fecha": "2026-04-20",
 *   "diaSemana": null  // Eliminar diaSemana
 * }
 */
router.put("/:id", claseController.update);

/**
 * DELETE /api/clases/:id
 *
 * Elimina una clase de la base de datos
 *
 * Ejemplo:
 * - DELETE /api/clases/64f3a1b2c4d5e6f7a8b9c0d1
 */
router.delete("/:id", claseController.remove);

// ========== EXPORTACIÓN ==========
// Exportamos el router para montarlo en app.js
module.exports = router;
