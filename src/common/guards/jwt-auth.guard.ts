import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Reemplaza al middleware verificarToken() de Express.
 *
 * Sobreescribimos handleRequest para reproducir los mismos 3 mensajes que daba Express
 * según el caso, en vez del "Unauthorized" genérico que da Passport por defecto:
 * - Sin token / header Authorization ausente -> "Token no proporcionado"
 * - Token con firma inválida o malformado -> "Token inválido"
 * - Token expirado -> "Token expirado"
 *
 * Uso: @UseGuards(JwtAuthGuard) en los controladores/rutas que requieran autenticación.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  // Firma genérica <TUser> requerida por el tipo IAuthGuard.handleRequest de Passport
  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    info: { name?: string; message?: string },
  ): TUser {
    if (info?.name === "TokenExpiredError") {
      throw new UnauthorizedException("Token expirado");
    }

    if (!user) {
      // passport-jwt informa "No auth token" cuando no hay header Authorization
      const sinToken = info?.message === "No auth token";
      throw new UnauthorizedException(
        sinToken ? "Token no proporcionado" : "Token inválido",
      );
    }

    if (err) {
      throw err;
    }

    return user;
  }
}
