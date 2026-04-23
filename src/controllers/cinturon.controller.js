const Cinturon = require("../models/cinturon.model");
const mongoose = require("mongoose");

// ========== LISTAR TODOS LOS CINTURONES ==========
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
const getById = async (req, res) => {
  try {
    const { id } = req.params;

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
const create = async (req, res) => {
  try {
    const { color, grado } = req.body;

    if (color == null || grado == null) {
      return res
        .status(400)
        .json({ mensaje: "color y grado son obligatorios" });
    }

    const nuevoCinturon = new Cinturon({ color, grado });
    await nuevoCinturon.save();

    res.status(201).json(nuevoCinturon);
  } catch (error) {
    console.error("Error al crear cinturón:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al crear el cinturón" });
  }
};

// ========== ACTUALIZAR CINTURÓN ==========
const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de cinturón inválido" });
    }

    const { color, grado } = req.body;
    const cambios = {};
    if (color != null) cambios.color = color;
    if (grado != null) cambios.grado = grado;

    if (Object.keys(cambios).length === 0) {
      return res
        .status(400)
        .json({ mensaje: "No se han enviado campos para actualizar" });
    }

    const cinturonActualizado = await Cinturon.findByIdAndUpdate(id, cambios, {
      new: true,
      runValidators: true,
    });

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
