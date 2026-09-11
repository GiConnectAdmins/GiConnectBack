import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { PersonModule } from './modules/person/person.module';
import { EquipoModule } from './modules/equipo/equipo.module';
import { ClaseModule } from './modules/clase/clase.module';
import { CinturonModule } from './modules/cinturon/cinturon.module';
import { BeltDateModule } from './modules/belt-date/belt-date.module';
import { SolicitudEquipoModule } from './modules/solicitud-equipo/solicitud-equipo.module';

@Module({
  imports: [
    // Carga el .env y valida las variables obligatorias al arrancar (ver env.validation.ts).
    // isGlobal: true -> ConfigService queda disponible en cualquier módulo sin volver a importarlo
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),

    // Conexión a MongoDB Atlas: la MISMA base de datos que usa hoy el backend Express
    // (mismo MONGO_URI), así que no hace falta migrar ni tocar ningún dato existente
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URI,
      }),
    }),

    PersonModule,
    AuthModule,
    EquipoModule,
    ClaseModule,
    CinturonModule,
    BeltDateModule,
    SolicitudEquipoModule,
    // Todos los módulos de dominio ya están migrados. Quedan los hitos 8-10:
    // endurecimiento de seguridad transversal, punto de corte y limpieza final.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
