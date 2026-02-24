const mongoose = require("mongoose");

const COLORS = [
  "Blanco",
  "Blanco/Amarillo",
  "Amarillo",
  "Amarillo/Naranja",
  "Naranja",
  "Naranja/Verde",
  "Verde",
  "Verde/Azul",
  "Azul",
  "Morado",
  "Marron",
  "Negro",
];

const CinturonSchema = new mongoose.Schema(
  {
    color: { type: String, enum: COLORS, required: true },
    grado: { type: Number, enum: [0, 1, 2, 3, 4], required: true },
  },
  { timestamps: true },
);

const Cinturon = mongoose.model("Cinturon", CinturonSchema);

module.exports = Cinturon;
module.exports.COLORS = COLORS;
