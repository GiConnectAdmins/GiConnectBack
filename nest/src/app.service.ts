import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Devuelve el mismo mensaje de "estado" que tenía la ruta raíz (GET /) del backend
   * Express, para poder comprobar de un vistazo que el servidor está arriba sin romper
   * nada que ya dependa de este endpoint (comprobaciones manuales, Postman).
   */
  getStatus() {
    return {
      message: 'API de GiConnect funcionando ✅',
      version: '1.0.0',
    };
  }
}
