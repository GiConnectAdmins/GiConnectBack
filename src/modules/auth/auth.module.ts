import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PersonModule } from "../person/person.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PersonModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        // El tipo de @nestjs/jwt espera un literal tipo "7d" (StringValue), no un string
        // genérico — como viene de una variable de entorno no se puede verificar en
        // tiempo de compilación, así que se castea explícitamente.
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ||
            "7d") as `${number}${"d" | "h" | "m" | "s"}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
