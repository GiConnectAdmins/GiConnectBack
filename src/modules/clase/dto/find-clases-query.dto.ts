import { IsIn, IsMongoId, IsOptional, IsString } from "class-validator";
import { TIPOS_CLASE } from "../schemas/clase.schema";

/**
 * Filtros opcionales de GET /api/clases: ?maestro=...&tipo=...&titulo=...
 * (se pueden combinar, igual que en Express)
 */
export class FindClasesQueryDto {
  @IsOptional()
  @IsMongoId()
  maestro?: string;

  @IsOptional()
  @IsIn(TIPOS_CLASE)
  tipo?: string;

  @IsOptional()
  @IsString()
  titulo?: string;
}
