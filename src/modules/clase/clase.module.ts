import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Clase, ClaseSchema } from "./schemas/clase.schema";
import { ClaseService } from "./clase.service";
import { ClaseController } from "./clase.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Clase.name, schema: ClaseSchema }]),
  ],
  controllers: [ClaseController],
  providers: [ClaseService],
  exports: [ClaseService],
})
export class ClaseModule {}
