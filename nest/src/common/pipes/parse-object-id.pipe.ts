import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/**
 * Reemplaza los `if (!mongoose.Types.ObjectId.isValid(id))` repetidos en casi todos
 * los controladores de Express. Se aplica directamente sobre el parámetro de ruta:
 *
 * Uso: @Param('id', ParseObjectIdPipe) id: string
 *
 * Nota de fidelidad: centraliza el mensaje en "ID inválido" en vez de los mensajes
 * específicos por recurso que tenía Express ("ID de persona inválido", "ID de equipo
 * inválido"...) — es la simplificación explícita que recoge el plan de migración.
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isValidObjectId(value)) {
      throw new BadRequestException('ID inválido');
    }
    return value;
  }
}
