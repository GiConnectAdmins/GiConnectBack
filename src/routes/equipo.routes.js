const express = require("express");
const router = express.Router();
const equipoController = require("../controllers/equipo.controller");

router.get("/", equipoController.getAll);
router.get("/:id", equipoController.getById);
router.post("/", equipoController.create);
router.put("/:id", equipoController.update);
router.delete("/:id", equipoController.remove);

module.exports = router;
