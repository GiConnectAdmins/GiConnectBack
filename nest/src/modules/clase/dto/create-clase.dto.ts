import { IsDateString, IsIn, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { DIAS_SEMANA, HORARIOS, TIPOS_CLASE } from '../schemas/clase.schema';

/**
 * Validación estructural básica (tipos, formatos, enums). La coherencia cruzada entre
 * tipo/fecha/diaSemana (ej: "una clase recurrente no debe tener fecha") se comprueba
 * en ClaseService, replicando los mismos mensajes que daba el controller de Express —
 * hacerlo aquí con decoradores condicionados sería más frágil que el chequeo explícito.
 */
export class CreateClaseDto {
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @IsString()
  titulo: string;

  @IsIn(TIPOS_CLASE, { message: `Tipo inválido. Valores permitidos: ${TIPOS_CLASE.join(', ')}` })
  tipo: string;

  @IsOptional()
  @IsDateString({}, { message: 'Fecha inválida' })
  fecha?: string;

  @IsOptional()
  @IsIn(DIAS_SEMANA, { message: `Día de la semana inválido. Valores permitidos: ${DIAS_SEMANA.join(', ')}` })
  diaSemana?: string;

  @IsIn(HORARIOS, { message: `Horario inválido. Valores permitidos: ${HORARIOS.join(', ')}` })
  hora: string;

  @IsInt({ message: 'El aforo máximo debe ser un número entero' })
  @Min(1)
  aforoMaximo: number;

  @IsMongoId({ message: 'El maestro debe ser un ID válido' })
  maestro: string;
}
