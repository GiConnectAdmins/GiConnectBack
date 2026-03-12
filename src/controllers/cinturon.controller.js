const mongoose = require('mongoose');
const Cinturon = require('../models/cinturon.model');

// Listar todos los cinturones
exports.getAll = async (req, res) => {
  try {
    const items = await Cinturon.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo cinturones' });
  }
};

// Obtener por ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });

    const item = await Cinturon.findById(id);
    if (!item) return res.status(404).json({ message: 'Cinturón no encontrado' });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo el cinturón' });
  }
};

// Crear nuevo cinturón
exports.create = async (req, res) => {
  try {
    const { color, grado } = req.body;
    if (color == null || grado == null) {
      return res.status(400).json({ message: 'color y grado son obligatorios' });
    }

    const COLORS = Cinturon.COLORS || [];
    if (!COLORS.includes(color)) {
      return res.status(400).json({ message: 'Color no válido', allowed: COLORS });
    }

    if (![0,1,2,3,4].includes(Number(grado))) {
      return res.status(400).json({ message: 'Grado no válido, debe ser 0..4' });
    }

    const newItem = new Cinturon({ color, grado });
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creando el cinturón' });
  }
};

// Actualizar
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });

    const { color, grado } = req.body;
    const update = {};
    if (color != null) update.color = color;
    if (grado != null) update.grado = grado;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Nada que actualizar' });
    }

    // Validate provided fields before updating
    const COLORS = Cinturon.COLORS || [];
    if (update.color && !COLORS.includes(update.color)) {
      return res.status(400).json({ message: 'Color no válido', allowed: COLORS });
    }
    if (update.grado != null && ![0,1,2,3,4].includes(Number(update.grado))) {
      return res.status(400).json({ message: 'Grado no válido, debe ser 0..4' });
    }

    const updated = await Cinturon.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Cinturón no encontrado' });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error actualizando el cinturón' });
  }
};

// Eliminar
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'ID inválido' });

    const deleted = await Cinturon.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Cinturón no encontrado' });
    res.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error eliminando el cinturón' });
  }
};
