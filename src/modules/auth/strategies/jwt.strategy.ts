import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PersonService } from "../../person/person.service";

interface JwtPayload {
  id: string;
  email: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly personService: PersonService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * Passport llama a este método automáticamente DESPUÉS de verificar que la firma
   * del token es válida y que no ha expirado. Reproduce lo que hacía verificarToken
   * en Express: busca el usuario completo en la DB (por si fue eliminado tras emitir
   * el token) y lo devuelve — Passport lo adjunta automáticamente a request.user.
   */
  async validate(payload: JwtPayload) {
    const usuario = await this.personService.findById(payload.id);
    if (!usuario) {
      throw new UnauthorizedException("Token inválido: usuario no encontrado");
    }
    return usuario;
  }
}
