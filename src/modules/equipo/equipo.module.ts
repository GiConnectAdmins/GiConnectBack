import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Equipo, EquipoSchema } from "./schemas/equipo.schema";
import { EquipoService } from "./equipo.service";
import { EquipoController } from "./equipo.controller";
import { PersonModule } from "../person/person.module";
import { MaestroResponsableGuard } from "../../common/guards/maestro-responsable.guard";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Equipo.name, schema: EquipoSchema }]),
    // Necesario para inyectar PersonService en resetClasesImpartidas (ver equipo.service.ts).
    // No genera dependencia circular: PersonModule registra su PROPIO binding del modelo
    // Equipo (ver person.module.ts) en vez de importar EquipoModule, así que la relación
    // entre ambos módulos es de un solo sentido (Equipo -> Person).
    PersonModule,
  ],
  controllers: [EquipoController],
  providers: [EquipoService, MaestroResponsableGuard],
  exports: [EquipoService, MongooseModule],
})
export class EquipoModule {}
