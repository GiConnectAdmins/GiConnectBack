import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type BeltDateDocument = HydratedDocument<BeltDate>;

/**
 * Nota: igual que Cinturon, este schema se crea ya en el hito 3 porque Person lo
 * referencia en populate('beltDates'). El módulo completo (controlador CRUD) se
 * construye en el hito 6, reutilizando este mismo archivo.
 */
@Schema({ timestamps: true })
export class BeltDate {
  @Prop({ type: Types.ObjectId, ref: "Cinturon", required: true })
  cinturon: Types.ObjectId;

  @Prop({ type: Date, required: true, default: Date.now })
  fecha: Date;
}

export const BeltDateSchema = SchemaFactory.createForClass(BeltDate);
