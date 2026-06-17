const express = require("express");
const router = express.Router();
const equipoController = require("../controllers/equipo.controller");
const { resetClasesImpartidas } = require("../controllers/person.controller");
const { verificarToken, verificarRol } = require("../middlewares/auth.middleware");

router.get("/", equipoController.getAll);
router.get("/:id", equipoController.getById);
router.post("/", equipoController.create);
router.put("/:id", equipoController.update);
router.delete("/:id", equipoController.remove);

// PUT /api/equipos/:id/reset-clases-impartidas
// Resetea clasesImpartidas a 0 para todos los maestros del equipo (Maestro del equipo o Admin)
router.put("/:id/reset-clases-impartidas", verificarToken, verificarRol("Admin", "Maestro"), resetClasesImpartidas);

module.exports = router;
