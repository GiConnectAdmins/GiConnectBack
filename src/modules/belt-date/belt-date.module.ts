import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BeltDate, BeltDateSchema } from "./schemas/belt-date.schema";
import { Cinturon, CinturonSchema } from "../cinturon/schemas/cinturon.schema";
import { BeltDateService } from "./belt-date.service";
import { BeltDateController } from "./belt-date.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BeltDate.name, schema: BeltDateSchema },
      // BeltDateService necesita comprobar que el cinturón referenciado existe (create/update)
      { name: Cinturon.name, schema: CinturonSchema },
    ]),
  ],
  controllers: [BeltDateController],
  providers: [BeltDateService],
  exports: [BeltDateService],
})
export class BeltDateModule {}
