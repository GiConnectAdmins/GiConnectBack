import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // GET / — ruta de comprobación de que la API está funcionando (sin prefijo /api)
  @Get()
  getStatus() {
    return this.appService.getStatus();
  }
}
