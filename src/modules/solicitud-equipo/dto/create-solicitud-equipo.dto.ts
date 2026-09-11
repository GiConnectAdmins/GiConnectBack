import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { TIPOS_SOLICITUD } from "../schemas/solicitud-equipo.schema";

/**
 * A propósito NO incluye "atleta": siempre se toma del usuario autenticado
 * (@CurrentUser() en el controller), nunca del body — así nadie puede crear
 * solicitudes en nombre de otra persona, igual que en Express.
 */
export class CreateSolicitudEquipoDto {
  @IsNotEmpty({ message: "El equipo es obligatorio" })
  @IsMongoId({ message: "ID de equipo inválido" })
  equipo: string;

  @IsIn(TIPOS_SOLICITUD, {
    message: `Tipo de solicitud inválido. Valores permitidos: ${TIPOS_SOLICITUD.join(", ")}`,
  })
  tipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mensaje?: string;
}
