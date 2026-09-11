import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { AppThrottlerGuard } from "./common/guards/throttler.guard";
import { AppService } from "./app.service";
import configuration from "./config/configuration";
import { envValidationSchema } from "./config/env.validation";
import { AuthModule } from "./modules/auth/auth.module";
import { PersonModule } from "./modules/person/person.module";
import { EquipoModule } from "./modules/equipo/equipo.module";
import { ClaseModule } from "./modules/clase/clase.module";
import { CinturonModule } from "./modules/cinturon/cinturon.module";
import { BeltDateModule } from "./modules/belt-date/belt-date.module";
import { SolicitudEquipoModule } from "./modules/solicitud-equipo/solicitud-equipo.module";

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

    // Rate limiting global (T21: anti fuerza bruta). Límite generoso por defecto para
    // no molestar el uso normal de la API; el login usa un límite mucho más estricto
    // con @Throttle() directamente en AuthController (ver auth.controller.ts).
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000, // 60 segundos
        limit: 100, // 100 peticiones por IP cada 60s en el resto de endpoints
      },
    ]),

    PersonModule,
    AuthModule,
    EquipoModule,
    ClaseModule,
    CinturonModule,
    BeltDateModule,
    SolicitudEquipoModule,
    // Todos los módulos de dominio ya están migrados. Quedan los hitos 9-10:
    // punto de corte y limpieza final.
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica el rate limiting a TODAS las rutas automáticamente, sin tener que
    // añadir el guard manualmente en cada controlador
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
