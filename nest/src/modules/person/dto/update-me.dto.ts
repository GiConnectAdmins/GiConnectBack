import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * Campos que un usuario autenticado puede modificar de SÍ MISMO vía PUT /api/personas/me.
 * email, password, rol, cinturon, beltDates, suscripcion, equipo y los contadores de
 * clases quedan fuera a propósito: el ValidationPipe global (whitelist: true) los
 * descarta aunque alguien los incluya en el body.
 */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  foto?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  edad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;

  @IsOptional()
  @IsString()
  numeroFederacion?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  afiliacion?: string[];
}
