import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type EquipoDocument = HydratedDocument<Equipo>;

/**
 * Nota: este schema se crea ya en el hito 3 porque PersonService lo necesita para las
 * reglas de visibilidad/permisos (comprobar si un Maestro es responsable de un equipo).
 * El módulo Equipo completo (controlador, servicio, DTOs) se construye en el hito 4,
 * reutilizando este mismo archivo.
 */
@Schema({ timestamps: true })
export class Equipo {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  direccion: string;

  @Prop({
    required: true,
    validate: {
      validator: (tel: string) => /^\d{9}$/.test(tel),
      message: "El teléfono debe tener exactamente 9 dígitos",
    },
  })
  telefono: string;

  @Prop({ required: true })
  fotoLogo: string;

  @Prop({ type: [String], default: [] })
  fotos: string[];

  // Maestros responsables/titulares de este equipo. Puede estar vacío para equipos
  // de referencia/publicidad (no aceptan solicitudes ni tienen gestión activa)
  @Prop({ type: [{ type: Types.ObjectId, ref: "Person" }], default: [] })
  maestrosResponsables: Types.ObjectId[];

  // Auto-referencia: equipos afiliados a este equipo
  @Prop({ type: [{ type: Types.ObjectId, ref: "Equipo" }], default: [] })
  afiliacion: Types.ObjectId[];

  obtenerDescripcion: () => string;
}

export const EquipoSchema = SchemaFactory.createForClass(Equipo);

EquipoSchema.methods.obtenerDescripcion = function (
  this: EquipoDocument,
): string {
  return `${this.nombre} - ${this.direccion} - Tel: ${this.telefono}`;
};
