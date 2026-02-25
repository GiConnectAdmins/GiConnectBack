const mongoose = require("mongoose");

const ROLES = ["Admin", "Maestro", "Atleta"];
const SUBSCRIPTIONS = ["mensual", "bono"];

const PersonSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellidos: { type: String, default: "", trim: true },
    telefono: { type: String, default: "" },
    foto: { type: String, default: "" },
    edad: { type: Number, min: 0 },
    peso: { type: Number, min: 0 },
    rol: { type: String, enum: ROLES, default: "Atleta" },
    cinturon: { type: mongoose.Schema.Types.ObjectId, ref: "Cinturon" },
    beltDates: [{ type: mongoose.Schema.Types.ObjectId, ref: "BeltDate" }],
    numeroFederacion: { type: String, default: "" },
    clasesAsistidas: { type: Number, default: 0, min: 0 },
    clasesImpartidas: { type: Number, default: 0, min: 0 },
    suscripcion: { type: String, enum: SUBSCRIPTIONS },
    equipo: { type: mongoose.Schema.Types.ObjectId, ref: "Equipo" },
    afiliacion: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipo" }],
  },
  { timestamps: true },
);

const Person = mongoose.model("Person", PersonSchema);

module.exports = Person;
module.exports.ROLES = ROLES;
module.exports.SUBSCRIPTIONS = SUBSCRIPTIONS;
