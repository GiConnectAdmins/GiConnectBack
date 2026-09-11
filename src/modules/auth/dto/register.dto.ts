import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

/**
 * DTO del registro público.
 *
 * A PROPÓSITO no incluye ningún campo "rol": el ValidationPipe global (whitelist: true,
 * ver main.ts) descarta cualquier propiedad no declarada aquí, así que aunque alguien
 * mande { "rol": "Admin" } en el body, nunca llega ni al controlador ni al servicio.
 * Además, PersonService.create() fuerza rol: "Atleta" como segunda capa de seguridad.
 * Esto corrige el bug de seguridad que tenía el backend Express (aceptaba el rol del body).
 *
 * La validación completa y fuerte del password (mayúsculas, símbolos, etc.) sigue viviendo
 * en el schema de Mongoose (person.schema.ts) — aquí solo comprobamos lo mínimo como
 * primera barrera antes de llegar a la base de datos.
 */
export class RegisterDto {
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @IsString()
  nombre: string;

  @IsNotEmpty({ message: "Los apellidos son obligatorios" })
  @IsString()
  apellidos: string;

  @IsNotEmpty({ message: "El teléfono es obligatorio" })
  @IsString()
  telefono: string;

  @IsEmail({}, { message: "El formato del email no es válido" })
  email: string;

  @IsString()
  @MinLength(8, { message: "El password debe tener mínimo 8 caracteres" })
  password: string;
}
