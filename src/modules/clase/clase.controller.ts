import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ClaseService } from "./clase.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import { CreateClaseDto } from "./dto/create-clase.dto";
import { UpdateClaseDto } from "./dto/update-clase.dto";
import { FindClasesQueryDto } from "./dto/find-clases-query.dto";

@Controller("clases")
export class ClaseController {
  constructor(private readonly claseService: ClaseService) {}

  // GET /api/clases — cualquier usuario autenticado (antes estaba completamente abierta)
  @Get()
  @UseGuards(JwtAuthGuard)
  getAll(@Query() query: FindClasesQueryDto) {
    return this.claseService.getAll(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getById(@Param("id", ParseObjectIdPipe) id: string) {
    return this.claseService.getById(id);
  }

  // POST/PUT/DELETE — solo Admin y Maestro (regla de negocio ya establecida)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  create(@Body() dto: CreateClaseDto) {
    return this.claseService.create(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  update(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdateClaseDto,
  ) {
    return this.claseService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin", "Maestro")
  remove(@Param("id", ParseObjectIdPipe) id: string) {
    return this.claseService.remove(id);
  }
}
