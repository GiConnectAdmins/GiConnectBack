import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  SolicitudEquipo,
  SolicitudEquipoSchema,
} from "./schemas/solicitud-equipo.schema";
import { Person, PersonSchema } from "../person/schemas/person.schema";
import { Equipo, EquipoSchema } from "../equipo/schemas/equipo.schema";
import { SolicitudEquipoService } from "./solicitud-equipo.service";
import { SolicitudEquipoController } from "./solicitud-equipo.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SolicitudEquipo.name, schema: SolicitudEquipoSchema },
      // Person y Equipo: SolicitudEquipoService los necesita directamente por DI
      // (ver el porqué en el comentario de cabecera de solicitud-equipo.schema.ts)
      { name: Person.name, schema: PersonSchema },
      { name: Equipo.name, schema: EquipoSchema },
    ]),
  ],
  controllers: [SolicitudEquipoController],
  providers: [SolicitudEquipoService],
  exports: [SolicitudEquipoService],
})
export class SolicitudEquipoModule {}
