import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const TIPOS_CLASE = ['recurrente', 'especial'] as const;
export type TipoClase = (typeof TIPOS_CLASE)[number];

export const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const HORARIOS = ['10:00-11:30', '18:00-19:30', '19:30-21:00'] as const;
export type Horario = (typeof HORARIOS)[number];

export type ClaseDocument = HydratedDocument<Clase>;

@Schema({ timestamps: true })
export class Clase {
  @Prop({ required: true, trim: true })
  titulo: string;

  @Prop({ type: String, enum: TIPOS_CLASE, required: true })
  tipo: TipoClase;

  // Solo obligatoria si tipo === 'especial' (red de seguridad a nivel de schema;
  // la validación "de verdad" con los mensajes específicos vive en ClaseService)
  @Prop({
    type: Date,
    required: function (this: Clase) {
      return this.tipo === 'especial';
    },
  })
  fecha?: Date;

  // Solo obligatorio si tipo === 'recurrente'
  @Prop({
    type: String,
    enum: DIAS_SEMANA,
    required: function (this: Clase) {
      return this.tipo === 'recurrente';
    },
  })
  diaSemana?: DiaSemana;

  @Prop({ type: String, enum: HORARIOS, required: true })
  hora: Horario;

  @Prop({
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'El aforo máximo debe ser un número entero',
    },
  })
  aforoMaximo: number;

  @Prop({ type: Types.ObjectId, ref: 'Person', required: true })
  maestro: Types.ObjectId;

  obtenerDescripcion: () => string;
}

export const ClaseSchema = SchemaFactory.createForClass(Clase);

// Red de seguridad a nivel de base de datos: si por cualquier vía se intenta guardar
// una clase incoherente (recurrente con fecha, o especial con diaSemana), se rechaza
// aquí también, aunque la validación principal ya la haga ClaseService antes de llegar.
ClaseSchema.pre('save', function (this: ClaseDocument) {
  if (this.tipo === 'recurrente' && this.fecha) {
    throw new Error('Una clase recurrente no debe tener campo "fecha"');
  }
  if (this.tipo === 'especial' && this.diaSemana) {
    throw new Error('Una clase especial no debe tener campo "diaSemana"');
  }
});

ClaseSchema.methods.obtenerDescripcion = function (this: ClaseDocument): string {
  if (this.tipo === 'recurrente') {
    return `${this.titulo} - Todos los ${this.diaSemana} a las ${this.hora}`;
  }
  const fechaFormateada = (this.fecha as Date).toLocaleDateString('es-ES');
  return `${this.titulo} - ${fechaFormateada} a las ${this.hora}`;
};
