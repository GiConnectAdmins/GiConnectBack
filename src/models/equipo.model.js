const mongoose = require('mongoose');

const EquipoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  direccion: { type: String, default: '' },
  telefono: { type: String, default: '' },
  fotoLogo: { type: String, default: '' },
  fotos: { type: [String], default: [] },
  // Afiliacion: puede contener 0 o más equipos (referencias a otros documentos Equipo)
  afiliacion: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipo' }]
}, { timestamps: true });

const Equipo = mongoose.model('Equipo', EquipoSchema);
module.exports = Equipo;
