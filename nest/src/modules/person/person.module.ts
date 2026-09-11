import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Person, PersonSchema } from './schemas/person.schema';
import { PersonService } from './person.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Person.name, schema: PersonSchema }])],
  providers: [PersonService],
  // Se exporta también MongooseModule para que otros módulos (Equipo, SolicitudEquipo...)
  // puedan inyectar el modelo Person directamente cuando lo necesiten en hitos futuros.
  exports: [PersonService, MongooseModule],
})
export class PersonModule {}
