import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export const ESTADOS = ["pendiente", "aceptada", "rechazada"] as const;
export type EstadoSolicitud = (typeof ESTADOS)[number];

export const TIPOS_SOLICITUD = ["equipo", "afiliacion"] as const;
export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number];

export type SolicitudEquipoDocument = HydratedDocument<SolicitudEquipo>;

/**
 * A diferencia del resto de schemas de esta migración, este NO lleva la lógica de
 * negocio (aceptar/rechazar/validación de duplicados) como métodos o pre-save.
 *
 * En el Express original esa lógica vivía en el modelo y hacía require() de Person y
 * Equipo dentro del propio archivo — típico code smell de Mongoose puro para evitar
 * dependencias circulares de módulos. En Nest se traslada a SolicitudEquipoService,
 * que inyecta esos modelos limpiamente vía DI (ver solicitud-equipo.service.ts).
 * Este archivo queda reducido a forma + índices.
 */
@Schema({ timestamps: true })
export class SolicitudEquipo {
  @Prop({ type: Types.ObjectId, ref: "Person", required: true, index: true })
  atleta: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Equipo", required: true, index: true })
  equipo: Types.ObjectId;

  @Prop({ type: String, enum: TIPOS_SOLICITUD, required: true })
  tipo: TipoSolicitud;

  @Prop({ type: String, enum: ESTADOS, default: "pendiente", required: true })
  estado: EstadoSolicitud;

  @Prop({ type: Date, required: true, default: Date.now })
  fechaSolicitud: Date;

  @Prop({ type: Date, default: null })
  fechaRespuesta: Date | null;

  @Prop({ maxlength: 500, trim: true })
  mensaje?: string;

  @Prop({ maxlength: 500, trim: true })
  respuestaMaestro?: string;
}

export const SolicitudEquipoSchema =
  SchemaFactory.createForClass(SolicitudEquipo);

// Mismos índices compuestos que en Express
SolicitudEquipoSchema.index({ atleta: 1, equipo: 1, tipo: 1, estado: 1 });
SolicitudEquipoSchema.index({ equipo: 1, estado: 1 });
SolicitudEquipoSchema.index({ atleta: 1, estado: 1 });
