import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Cinturon, CinturonSchema } from './schemas/cinturon.schema';
import { CinturonService } from './cinturon.service';
import { CinturonController } from './cinturon.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Cinturon.name, schema: CinturonSchema }])],
  controllers: [CinturonController],
  providers: [CinturonService],
  exports: [CinturonService, MongooseModule],
})
export class CinturonModule {}
