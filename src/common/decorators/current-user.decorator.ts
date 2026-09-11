import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Extrae el usuario autenticado adjuntado por JwtStrategy (equivalente a req.user
 * en el Express actual). Solo tiene sentido usarlo en rutas protegidas con JwtAuthGuard.
 *
 * Uso: getMe(@CurrentUser() user: PersonDocument) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
