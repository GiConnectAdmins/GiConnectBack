import { IsIn, IsNotEmpty } from 'class-validator';
import { ROLES } from '../schemas/person.schema';

export class ChangeRoleDto {
  @IsNotEmpty({ message: 'El rol es obligatorio' })
  @IsIn(ROLES, { message: `Rol inválido. Valores permitidos: ${ROLES.join(', ')}` })
  rol: string;
}
