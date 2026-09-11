import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { SolicitudEquipoService } from "./solicitud-equipo.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import type { PersonDocument } from "../person/schemas/person.schema";
import { CreateSolicitudEquipoDto } from "./dto/create-solicitud-equipo.dto";
import { RespondSolicitudEquipoDto } from "./dto/respond-solicitud-equipo.dto";

@Controller("solicitudes-equipo")
export class SolicitudEquipoController {
  constructor(
    private readonly solicitudEquipoService: SolicitudEquipoService,
  ) {}

  // POST /api/solicitudes-equipo — solo Atleta
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Atleta")
  create(
    @CurrentUser() user: PersonDocument,
    @Body() dto: CreateSolicitudEquipoDto,
  ) {
    return this.solicitudEquipoService.create(user._id.toString(), dto);
  }

  // GET /api/solicitudes-equipo/mias — solo Atleta (sus propias solicitudes)
  @Get("mias")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Atleta")
  getMisSolicitudes(@CurrentUser() user: PersonDocument) {
    return this.solicitudEquipoService.getMisSolicitudes(user._id.toString());
  }

  // GET /api/solicitudes-equipo/equipo/:equipoId — Admin o Maestro responsable
  @Get("equipo/:equipoId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  getPendientesPorEquipo(
    @Param("equipoId", ParseObjectIdPipe) equipoId: string,
    @CurrentUser() user: PersonDocument,
  ) {
    return this.solicitudEquipoService.getPendientesPorEquipo(equipoId, user);
  }

  // PUT /api/solicitudes-equipo/:id/aceptar — Admin o Maestro responsable
  @Put(":id/aceptar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  aceptar(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: PersonDocument,
    @Body() dto: RespondSolicitudEquipoDto,
  ) {
    return this.solicitudEquipoService.aceptar(id, user, dto);
  }

  // PUT /api/solicitudes-equipo/:id/rechazar — Admin o Maestro responsable
  @Put(":id/rechazar")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  rechazar(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: PersonDocument,
    @Body() dto: RespondSolicitudEquipoDto,
  ) {
    return this.solicitudEquipoService.rechazar(id, user, dto);
  }
}
