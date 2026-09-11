import { NestFactory } from "@nestjs/core";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas quedan bajo /api/... igual que en Express (/api/auth, /api/personas...),
  // EXCEPTO la raíz "/" (la ruta de comprobación de estado no llevaba prefijo tampoco en Express)
  app.setGlobalPrefix("api", {
    exclude: [{ path: "/", method: RequestMethod.GET }],
  });

  // Cabeceras de seguridad HTTP (protección básica: XSS, sniffing de MIME type, etc.)
  // Resuelve la parte de "helmet" del ticket de seguridad pendiente del backend Express (T21)
  app.use(helmet());

  // CORS: si hay FRONTEND_URL definida (típicamente en producción) se restringe a ese origen;
  // si no (en desarrollo, mientras no exista frontend desplegado) se permite cualquiera,
  // igual que el cors() completamente abierto que tiene hoy el backend Express
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl || true,
    credentials: true,
  });

  // Valida automáticamente todos los DTOs de entrada (body/query/params) con class-validator
  // whitelist: descarta cualquier propiedad no declarada en el DTO antes de que llegue al
  // controlador/servicio -> esto es lo que soluciona de raíz el bug de mass-assignment que
  // tenía el update de Equipo en Express (pasaba req.body entero sin filtrar)
  // transform: convierte tipos primitivos automáticamente (ej: query param "5" -> number 5)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Filtro global de excepciones: normaliza CUALQUIER error a { mensaje } (ver el archivo)
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Servidor NestJS corriendo en puerto ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}`);
}
bootstrap();
