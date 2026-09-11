import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

/**
 * Extiende el ThrottlerGuard por defecto solo para dar un mensaje en español,
 * consistente con el resto de mensajes de error de la API (contrato { mensaje }).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Demasiadas peticiones. Inténtalo de nuevo en un minuto.');
  }
}
