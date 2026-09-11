import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// 12 colores del catálogo de cinturones (igual que en el Express actual)
export const COLORS = [
  'Blanco',
  'Blanco/Amarillo',
  'Amarillo',
  'Amarillo/Naranja',
  'Naranja',
  'Naranja/Verde',
  'Verde',
  'Verde/Azul',
  'Azul',
  'Morado',
  'Marron',
  'Negro',
] as const;

export type ColorCinturon = (typeof COLORS)[number];
export type CinturonDocument = HydratedDocument<Cinturon>;

/**
 * Nota: este schema se crea ya en el hito 3 porque Person referencia Cinturon en sus
 * populate() (cinturon, beltDates). El módulo Cinturon completo (controlador CRUD,
 * seed T20) se construye en el hito 6, reutilizando este mismo archivo.
 */
@Schema({ timestamps: true })
export class Cinturon {
  @Prop({ type: String, enum: COLORS, required: true })
  color: ColorCinturon;

  @Prop({ enum: [0, 1, 2, 3, 4], required: true })
  grado: number;
}

export const CinturonSchema = SchemaFactory.createForClass(Cinturon);
