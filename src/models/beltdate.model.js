const mongoose = require('mongoose');

const BeltDateSchema = new mongoose.Schema({
  cinturon: { type: mongoose.Schema.Types.ObjectId, ref: 'Cinturon', required: true },
  fecha: { type: Date, required: true }
}, { timestamps: true });

const BeltDate = mongoose.model('BeltDate', BeltDateSchema);

module.exports = BeltDate;
