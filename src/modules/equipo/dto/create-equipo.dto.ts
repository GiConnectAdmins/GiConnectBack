import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

/**
 * A propósito NO incluye "maestrosResponsables": en Express tampoco se podía asignar
 * al crear (esa relación se gestiona por otra vía). Al no declararlo aquí, el
 * ValidationPipe global (whitelist: true) lo descarta aunque alguien lo envíe.
 */
export class CreateEquipoDto {
  @IsNotEmpty({ message: "El nombre del equipo es obligatorio" })
  @IsString()
  nombre: string;

  @IsNotEmpty({ message: "La dirección es obligatoria" })
  @IsString()
  direccion: string;

  @IsNotEmpty({ message: "El teléfono es obligatorio" })
  @Matches(/^\d{9}$/, {
    message: "El teléfono debe tener exactamente 9 dígitos",
  })
  telefono: string;

  @IsNotEmpty({ message: "El logo es obligatorio" })
  @IsString()
  fotoLogo: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotos?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  afiliacion?: string[];
}
