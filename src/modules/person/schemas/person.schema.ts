import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import * as bcrypt from "bcryptjs";

// ========== ENUMS (valores permitidos) ==========
// Se mantienen como arrays exportados, igual que en el modelo Mongoose de Express,
// para poder reutilizarlos en DTOs/validaciones sin repetir los valores a mano.

export const ROLES = ["Admin", "Maestro", "Atleta"] as const;
export type Rol = (typeof ROLES)[number];

export const SUSCRIPCIONES = ["mensual", "bono"] as const;
export type TipoSuscripcion = (typeof SUSCRIPCIONES)[number];

export type PersonDocument = HydratedDocument<Person>;

@Schema({ timestamps: true })
export class Person {
  // ===== CAMPOS OBLIGATORIOS =====

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  apellidos: string;

  @Prop({ required: true })
  telefono: string;

  // Email único para autenticación (login). Se valida formato con regex propia.
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: "El formato del email no es válido",
    },
  })
  email: string;

  // Password hasheado con bcrypt. select:false -> nunca se devuelve en consultas por
  // defecto (hay que pedirlo explícitamente con .select('+password'), ver PersonService).
  @Prop({
    required: true,
    select: false,
    validate: {
      validator: (password: string) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-_/&%$+=*@#]).{8,}$/.test(
          password,
        ),
      message:
        "El password debe tener mínimo 8 caracteres, al menos 1 mayúscula, " +
        "1 minúscula, 1 número y 1 carácter especial de estos: - _ / & % $ + = * @ #)",
    },
  })
  password: string;

  // ===== CAMPOS OPCIONALES =====

  @Prop({ default: "" })
  foto: string;

  @Prop({ min: 0 })
  edad?: number;

  @Prop({ min: 0 })
  peso?: number;

  @Prop({ default: "" })
  numeroFederacion: string;

  // ===== CAMPOS CON VALORES POR DEFECTO =====

  // type: String explícito porque TypeScript no puede inferir un tipo runtime concreto
  // para un union de literales de texto vía metadata de decoradores (emite "Object")
  @Prop({ type: String, enum: ROLES, default: "Atleta" })
  rol: Rol;

  @Prop({ type: Types.ObjectId, ref: "Cinturon", default: null })
  cinturon: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: "BeltDate" }], default: [] })
  beltDates: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  clasesAsistidas: number;

  @Prop({ default: 0, min: 0 })
  clasesImpartidas: number;

  // Nota: se mantiene el nombre "suscripcion" tal cual está en Express (no se renombra
  // a cuotaGimnasio aquí) — ese refactor es el ticket T26, fuera de alcance de esta migración.
  // type: String explícito por el mismo motivo que en "rol" (aquí además el union
  // incluye "| null", que hace que TS emita "Object" en vez de poder inferir nada)
  @Prop({ type: String, enum: SUSCRIPCIONES, default: null })
  suscripcion: TipoSuscripcion | null;

  @Prop({ type: Types.ObjectId, ref: "Equipo", default: null })
  equipo: Types.ObjectId | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: "Equipo" }], default: [] })
  afiliacion: Types.ObjectId[];

  // Declaración de tipo del método de instancia añadido más abajo vía PersonSchema.methods.
  // TypeScript necesita esta firma en la clase para reconocer usuario.compararPassword(...).
  compararPassword: (passwordIngresado: string) => Promise<boolean>;
}

export const PersonSchema = SchemaFactory.createForClass(Person);

// ========== MIDDLEWARE PRE-SAVE: HASHEAR PASSWORD ==========
// Se ejecuta antes de guardar. Solo hashea si el password fue modificado
// (nuevo usuario o cambio de password), igual que en el modelo Express.
PersonSchema.pre("save", async function (this: PersonDocument) {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ========== MÉTODO DE INSTANCIA: compararPassword ==========
// Compara un password en texto plano contra el hash guardado en la DB (login).
PersonSchema.methods.compararPassword = async function (
  this: PersonDocument,
  passwordIngresado: string,
): Promise<boolean> {
  return bcrypt.compare(passwordIngresado, this.password);
};
