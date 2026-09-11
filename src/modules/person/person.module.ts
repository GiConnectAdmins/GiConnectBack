import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Person, PersonSchema } from "./schemas/person.schema";
import { Equipo, EquipoSchema } from "../equipo/schemas/equipo.schema";
import { Cinturon, CinturonSchema } from "../cinturon/schemas/cinturon.schema";
import {
  BeltDate,
  BeltDateSchema,
} from "../belt-date/schemas/belt-date.schema";
import { PersonService } from "./person.service";
import { PersonController } from "./person.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      // Equipo: PersonService lo necesita para las reglas de visibilidad/permisos
      // (ver getById y updateById). En el hito 4, cuando exista EquipoModule completo,
      // esto se sustituirá por un import directo de EquipoModule.
      { name: Equipo.name, schema: EquipoSchema },
      // Cinturon y BeltDate: no se consultan desde PersonService, pero Mongoose
      // necesita que sus modelos existan para poder hacer populate('cinturon') y
      // populate('beltDates') en getAll/getMe/getById/updateMe/updateById. Los
      // módulos completos (CRUD) llegan en el hito 6, reutilizando estos mismos schemas.
      { name: Cinturon.name, schema: CinturonSchema },
      { name: BeltDate.name, schema: BeltDateSchema },
    ]),
  ],
  controllers: [PersonController],
  providers: [PersonService],
  exports: [PersonService, MongooseModule],
})
export class PersonModule {}
