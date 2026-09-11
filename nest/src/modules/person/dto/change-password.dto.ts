import { IsNotEmpty, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Debes proporcionar el password actual' })
  @IsString()
  passwordActual: string;

  @IsNotEmpty({ message: 'Debes proporcionar el password nuevo' })
  @IsString()
  passwordNuevo: string;
}
