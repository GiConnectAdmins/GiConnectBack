import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import { Error as MongooseError } from "mongoose";

/**
 * Filtro global de excepciones.
 *
 * En el backend Express actual, cada controlador repetía manualmente el mismo bloque
 * try/catch para transformar cualquier error en `res.status(x).json({ mensaje })`.
 * Aquí centralizamos esa lógica en un único sitio: los controladores/servicios de Nest
 * ya no necesitan try/catch para esto, simplemente lanzan la excepción (o dejan que
 * Mongoose la lance) y este filtro la intercepta y la formatea siempre igual.
 *
 * Mantiene el mismo contrato de respuesta que ya usa la colección Postman y que usará
 * el frontend: SIEMPRE `{ mensaje: string }`, nunca el formato por defecto de Nest
 * (`{ statusCode, message, error }`).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // ===== Errores de validación de schema de Mongoose =====
    // (campos required, enum, regex... definidos en los @Prop() de cada schema)
    // Igual que en Express: nos quedamos solo con el primer mensaje de error
    if (exception instanceof MongooseError.ValidationError) {
      const primerMensaje =
        Object.values(exception.errors)[0]?.message ?? "Error de validación";
      response.status(HttpStatus.BAD_REQUEST).json({ mensaje: primerMensaje });
      return;
    }

    // ===== ObjectId con formato inválido en una consulta a Mongoose =====
    if (exception instanceof MongooseError.CastError) {
      response.status(HttpStatus.BAD_REQUEST).json({ mensaje: "ID inválido" });
      return;
    }

    // ===== Excepciones HTTP de Nest =====
    // Incluye las que lanzamos nosotros (NotFoundException, ForbiddenException...)
    // y las que lanza el ValidationPipe global cuando un DTO no pasa las validaciones
    // de class-validator (esas traen "message" como array de strings, no un string suelto)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const cuerpo = exception.getResponse();

      let mensaje: string;
      if (typeof cuerpo === "string") {
        mensaje = cuerpo;
      } else {
        const mensajeCuerpo = (cuerpo as { message?: string | string[] })
          .message;
        mensaje = Array.isArray(mensajeCuerpo)
          ? mensajeCuerpo[0]
          : (mensajeCuerpo ?? exception.message);
      }

      response.status(status).json({ mensaje });
      return;
    }

    // ===== Cualquier otro error no controlado =====
    // No exponemos el detalle interno al cliente (podría filtrar información sensible),
    // pero sí lo dejamos en el log del servidor para poder depurarlo
    console.error("Error no controlado:", exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ mensaje: "Error interno del servidor" });
  }
}
