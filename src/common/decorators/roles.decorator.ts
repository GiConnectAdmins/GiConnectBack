import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Marca una ruta con los roles permitidos. RolesGuard lee esta metadata y compara
 * contra el rol del usuario autenticado (equivalente a verificarRol(...roles) en Express).
 *
 * Uso: @Roles('Admin', 'Maestro')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
