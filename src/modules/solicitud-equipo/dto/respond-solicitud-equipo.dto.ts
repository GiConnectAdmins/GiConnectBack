import { IsOptional, IsString, MaxLength } from "class-validator";

/** Body opcional de PUT /:id/aceptar y PUT /:id/rechazar */
export class RespondSolicitudEquipoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  respuestaMaestro?: string;
}
