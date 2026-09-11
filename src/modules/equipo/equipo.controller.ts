import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { EquipoService } from "./equipo.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { MaestroResponsableGuard } from "../../common/guards/maestro-responsable.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import { CreateEquipoDto } from "./dto/create-equipo.dto";
import { UpdateEquipoDto } from "./dto/update-equipo.dto";

@Controller("equipos")
export class EquipoController {
  constructor(private readonly equipoService: EquipoService) {}

  // GET /api/equipos — cualquier usuario autenticado (T21: antes estaba abierta)
  @Get()
  @UseGuards(JwtAuthGuard)
  getAll() {
    return this.equipoService.getAll();
  }

  // GET /api/equipos/:id — cualquier usuario autenticado
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getById(@Param("id", ParseObjectIdPipe) id: string) {
    return this.equipoService.getById(id);
  }

  // POST /api/equipos — solo Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  create(@Body() dto: CreateEquipoDto) {
    return this.equipoService.create(dto);
  }

  // PUT /api/equipos/:id — Admin o Maestro responsable de ESE equipo
  @Put(":id")
  @UseGuards(JwtAuthGuard, MaestroResponsableGuard)
  update(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEquipoDto,
  ) {
    return this.equipoService.update(id, dto);
  }

  // DELETE /api/equipos/:id — solo Admin
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  remove(@Param("id", ParseObjectIdPipe) id: string) {
    return this.equipoService.remove(id);
  }

  // PUT /api/equipos/:id/reset-clases-impartidas — Admin o Maestro responsable
  @Put(":id/reset-clases-impartidas")
  @UseGuards(JwtAuthGuard, MaestroResponsableGuard)
  resetClasesImpartidas(@Param("id", ParseObjectIdPipe) id: string) {
    return this.equipoService.resetClasesImpartidas(id);
  }
}
