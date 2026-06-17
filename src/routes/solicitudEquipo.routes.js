const express = require("express");
const router = express.Router();

const solicitudEquipoController = require("../controllers/solicitudEquipo.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

// ========== RUTAS ESTÁTICAS (deben ir ANTES que las paramétricas /:id) ==========
// Express evalúa rutas en orden. Si /:id fuera primero, "mias" se trataría como un ID.

// GET /api/solicitudes-equipo/mias — mis propias solicitudes (solo Atleta)
router.get(
  "/mias",
  verificarToken,
  verificarRol("Atleta"),
  solicitudEquipoController.getMisSolicitudes,
);

// GET /api/solicitudes-equipo/equipo/:equipoId — pendientes de un equipo (Admin o Maestro)
// La comprobación de que el Maestro es responsable de ESE equipo se hace en el controlador,
// porque depende del :equipoId de la ruta, no de un parámetro fijo
router.get(
  "/equipo/:equipoId",
  verificarToken,
  verificarRol("Admin", "Maestro"),
  solicitudEquipoController.getPendientesPorEquipo,
);

// ========== RUTAS GENERALES ==========

// POST /api/solicitudes-equipo — crear solicitud (solo Atleta)
router.post(
  "/",
  verificarToken,
  verificarRol("Atleta"),
  solicitudEquipoController.create,
);

// ========== RUTAS PARAMÉTRICAS (van DESPUÉS de las estáticas) ==========

// PUT /api/solicitudes-equipo/:id/aceptar — aceptar solicitud (Admin o Maestro responsable)
router.put(
  "/:id/aceptar",
  verificarToken,
  verificarRol("Admin", "Maestro"),
  solicitudEquipoController.aceptar,
);

// PUT /api/solicitudes-equipo/:id/rechazar — rechazar solicitud (Admin o Maestro responsable)
router.put(
  "/:id/rechazar",
  verificarToken,
  verificarRol("Admin", "Maestro"),
  solicitudEquipoController.rechazar,
);

module.exports = router;
