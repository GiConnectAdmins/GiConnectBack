const Equipo = require("../models/equipo.model");
const mongoose = require("mongoose");

// ========== LISTAR TODOS LOS EQUIPOS ==========
/**
 * GET /api/equipos
 *
 * Devuelve todos los equipos ordenados por fecha de creación descendente.
 * No populamos afiliacion aquí para aligerar la respuesta del listado.
 * El detalle completo (con afiliacion poblada) se obtiene en getById.
 */
const getAll = async (req, res) => {
  try {
    const equipos = await Equipo.find().sort({ createdAt: -1 });
    res.status(200).json(equipos);
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    res.status(500).json({ mensaje: "Error al obtener los equipos" });
  }
};

// ========== OBTENER EQUIPO POR ID ==========
/**
 * GET /api/equipos/:id
 *
 * Devuelve un equipo con el campo afiliacion poblado.
 * Solo traemos los campos necesarios del equipo afiliado para no
 * exponer datos innecesarios (nombre, direccion, telefono, fotoLogo).
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    // Populamos afiliacion con los campos mínimos necesarios para identificar el equipo
    const equipo = await Equipo.findById(id)
      .populate("afiliacion", "nombre direccion telefono fotoLogo");

    if (!equipo) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    res.status(200).json(equipo);
  } catch (error) {
    console.error("Error al obtener equipo por ID:", error);
    res.status(500).json({ mensaje: "Error al obtener el equipo" });
  }
};

// ========== CREAR NUEVO EQUIPO ==========
/**
 * POST /api/equipos
 *
 * Crea un nuevo equipo. El modelo tiene nombre, direccion, telefono y fotoLogo
 * como required, por lo que Mongoose lanzará ValidationError si faltan.
 * Solo comprobamos nombre manualmente para dar un mensaje más claro antes
 * de llegar al save().
 *
 * Body esperado: { nombre, direccion, telefono, fotoLogo, fotos?, afiliacion? }
 */
const create = async (req, res) => {
  try {
    const { nombre, direccion, telefono, fotoLogo, fotos, afiliacion } = req.body;

    // Validación explícita del campo más importante antes de llegar a Mongoose
    if (!nombre) {
      return res.status(400).json({ mensaje: "El nombre del equipo es obligatorio" });
    }

    const nuevoEquipo = new Equipo({ nombre, direccion, telefono, fotoLogo, fotos, afiliacion });
    await nuevoEquipo.save();

    res.status(201).json(nuevoEquipo);
  } catch (error) {
    console.error("Error al crear equipo:", error);

    // ValidationError cubre campos required faltantes (direccion, telefono, fotoLogo)
    // y cualquier otra validación definida en el schema
    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al crear el equipo" });
  }
};

// ========== ACTUALIZAR EQUIPO ==========
/**
 * PUT /api/equipos/:id
 *
 * Actualiza cualquier campo del equipo. Pasamos req.body directamente
 * porque el frontend solo enviará los campos que quiere modificar.
 * runValidators: true garantiza que las validaciones del schema se apliquen
 * también en actualizaciones parciales.
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    // new: true → devuelve el documento ya actualizado (no el antiguo)
    // runValidators: true → aplica las validaciones del schema en el update
    const equipoActualizado = await Equipo.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!equipoActualizado) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    res.status(200).json(equipoActualizado);
  } catch (error) {
    console.error("Error al actualizar equipo:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al actualizar el equipo" });
  }
};

// ========== ELIMINAR EQUIPO ==========
/**
 * DELETE /api/equipos/:id
 *
 * Elimina un equipo por su ID.
 * No elimina en cascada las referencias a este equipo en Person.equipo,
 * Person.afiliacion o Equipo.afiliacion. Esa limpieza queda fuera
 * del alcance de este controlador.
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    const equipoEliminado = await Equipo.findByIdAndDelete(id);

    if (!equipoEliminado) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    res.status(200).json({ mensaje: "Equipo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar equipo:", error);
    res.status(500).json({ mensaje: "Error al eliminar el equipo" });
  }
};

// ========== EXPORTACIONES ==========
module.exports = { getAll, getById, create, update, remove };
