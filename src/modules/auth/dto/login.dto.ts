import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "El formato del email no es válido" })
  email: string;

  @IsNotEmpty({ message: "El password es obligatorio" })
  @IsString()
  password: string;
}
