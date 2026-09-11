import { IsDateString, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateBeltDateDto {
  @IsNotEmpty({ message: 'El cinturón es obligatorio' })
  @IsMongoId({ message: 'ID de cinturón inválido' })
  cinturon: string;

  // Opcional: si no se envía, se usa la fecha actual (ver BeltDateService)
  @IsOptional()
  @IsDateString({}, { message: 'Fecha inválida' })
  fecha?: string;
}
