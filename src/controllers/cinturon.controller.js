const Cinturon = require("../models/cinturon.model");
const mongoose = require("mongoose");

// ========== LISTAR TODOS LOS CINTURONES ==========
/**
 * GET /api/cinturones
 *
 * Devuelve todos los cinturones ordenados por fecha de creación descendente.
 * No requiere parámetros.
 */
const getAll = async (req, res) => {
  try {
    const cinturones = await Cinturon.find().sort({ createdAt: -1 });
    res.status(200).json(cinturones);
  } catch (error) {
    console.error("Error al obtener cinturones:", error);
    res.status(500).json({ mensaje: "Error al obtener los cinturones" });
  }
};

// ========== OBTENER CINTURÓN POR ID ==========
/**
 * GET /api/cinturones/:id
 *
 * Devuelve un cinturón específico por su ID de MongoDB.
 * Validamos el formato del ID antes de consultar para evitar que Mongoose
 * lance un CastError innecesario.
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    // Comprobamos que el id tiene formato válido de ObjectId antes de consultar
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de cinturón inválido" });
    }

    const cinturon = await Cinturon.findById(id);

    if (!cinturon) {
      return res.status(404).json({ mensaje: "Cinturón no encontrado" });
    }

    res.status(200).json(cinturon);
  } catch (error) {
    console.error("Error al obtener cinturón por ID:", error);
    res.status(500).json({ mensaje: "Error al obtener el cinturón" });
  }
};

// ========== CREAR NUEVO CINTURÓN ==========
/**
 * POST /api/cinturones
 *
 * Crea un nuevo cinturón. El modelo ya valida que color sea uno de los
 * valores permitidos (enum) y que grado esté entre 0 y 4, por lo que
 * delegamos esas validaciones en Mongoose y solo comprobamos manualmente
 * que ambos campos estén presentes en el body.
 *
 * Body esperado: { color: String, grado: Number }
 */
const create = async (req, res) => {
  try {
    const { color, grado } = req.body;

    // Comprobación manual solo de presencia: las validaciones de valor
    // (color válido, grado en rango) las gestiona el schema de Mongoose
    if (color == null || grado == null) {
      return res.status(400).json({ mensaje: "color y grado son obligatorios" });
    }

    const nuevoCinturon = new Cinturon({ color, grado });
    await nuevoCinturon.save();

    res.status(201).json(nuevoCinturon);
  } catch (error) {
    console.error("Error al crear cinturón:", error);

    // ValidationError ocurre cuando color no está en el enum o grado está fuera de rango
    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al crear el cinturón" });
  }
};

// ========== ACTUALIZAR CINTURÓN ==========
/**
 * PUT /api/cinturones/:id
 *
 * Actualiza color y/o grado de un cinturón existente.
 * runValidators: true asegura que el enum de color y el rango de grado
 * se sigan respetando aunque sea una actualización parcial.
 *
 * Body esperado: { color?: String, grado?: Number }
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de cinturón inválido" });
    }

    const { color, grado } = req.body;

    // Construimos el objeto de cambios solo con los campos que vienen en el body
    const cambios = {};
    if (color != null) cambios.color = color;
    if (grado != null) cambios.grado = grado;

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({ mensaje: "No se han enviado campos para actualizar" });
    }

    // new: true → devuelve el documento ya actualizado (no el antiguo)
    // runValidators: true → aplica las validaciones del schema en el update
    const cinturonActualizado = await Cinturon.findByIdAndUpdate(
      id,
      cambios,
      { new: true, runValidators: true }
    );

    if (!cinturonActualizado) {
      return res.status(404).json({ mensaje: "Cinturón no encontrado" });
    }

    res.status(200).json(cinturonActualizado);
  } catch (error) {
    console.error("Error al actualizar cinturón:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al actualizar el cinturón" });
  }
};

// ========== ELIMINAR CINTURÓN ==========
/**
 * DELETE /api/cinturones/:id
 *
 * Elimina un cinturón por su ID.
 * Nota: no comprueba si el cinturón está referenciado en algún Person o BeltDate.
 * Esa limpieza de referencias queda fuera del alcance de este controlador.
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de cinturón inválido" });
    }

    const cinturonEliminado = await Cinturon.findByIdAndDelete(id);

    if (!cinturonEliminado) {
      return res.status(404).json({ mensaje: "Cinturón no encontrado" });
    }

    res.status(200).json({ mensaje: "Cinturón eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar cinturón:", error);
    res.status(500).json({ mensaje: "Error al eliminar el cinturón" });
  }
};

// ========== EXPORTACIONES ==========
module.exports = { getAll, getById, create, update, remove };
