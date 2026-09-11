import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoDto } from './create-equipo.dto';

/**
 * Mismos campos que CreateEquipoDto pero todos opcionales (actualización parcial).
 *
 * Esto es lo que corrige el bug de seguridad que tenía el backend Express: el update
 * pasaba req.body completo sin filtrar a findByIdAndUpdate, permitiendo inyectar
 * "maestrosResponsables" y auto-asignarse como responsable de un equipo. Al no existir
 * ese campo en CreateEquipoDto (ni por tanto aquí), el ValidationPipe global
 * (whitelist: true) lo descarta ANTES de que llegue al servicio.
 */
export class UpdateEquipoDto extends PartialType(CreateEquipoDto) {}
