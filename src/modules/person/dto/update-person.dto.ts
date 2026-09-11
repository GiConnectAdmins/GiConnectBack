import {
  IsArray,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { SUSCRIPCIONES } from "../schemas/person.schema";

/**
 * Superset de campos editables vía PUT /api/personas/:id.
 *
 * Representa lo que puede tocar un ADMIN: todos los campos salvo email, password, rol,
 * clasesAsistidas y clasesImpartidas — igual que CAMPOS_BLOQUEADOS en el Express actual.
 * Al no declarar esos campos aquí, el ValidationPipe global (whitelist: true) los
 * descarta solo, sin necesidad de una lista negra manual en el servicio.
 *
 * Cuando quien hace la petición es un MAESTRO, PersonService.updateById() aplica una
 * restricción ADICIONAL a nivel de negocio: de todo este DTO, solo se queda con
 * "suscripcion", y con "equipo" únicamente si viene como null (para expulsar a un
 * atleta de su equipo). Es una regla dependiente del ROL de quien pregunta, no de la
 * forma de los datos, así que esa parte vive en el servicio y no aquí.
 */
export class UpdatePersonDto {
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
  @ValidateIf((o: UpdatePersonDto) => o.suscripcion !== null)
  @IsIn(SUSCRIPCIONES)
  suscripcion?: string | null;

  // Puede ser un ID de equipo válido o null (null = expulsar/desasignar)
  @IsOptional()
  @ValidateIf((o: UpdatePersonDto) => o.equipo !== null)
  @IsMongoId()
  equipo?: string | null;

  @IsOptional()
  @ValidateIf((o: UpdatePersonDto) => o.cinturon !== null)
  @IsMongoId()
  cinturon?: string | null;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  beltDates?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  afiliacion?: string[];
}
