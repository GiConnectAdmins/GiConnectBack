import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CinturonService } from './cinturon.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateCinturonDto } from './dto/create-cinturon.dto';
import { UpdateCinturonDto } from './dto/update-cinturon.dto';

@Controller('cinturones')
export class CinturonController {
  constructor(private readonly cinturonService: CinturonService) {}

  // GET — sin auth todavía, igual que en Express hoy (se cierra en el hito 8)
  @Get()
  getAll() {
    return this.cinturonService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinturonService.getById(id);
  }

  // Catálogo fijo (12 colores x 5 grados, gestionado vía script seed T20): solo Admin
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  create(@Body() dto: CreateCinturonDto) {
    return this.cinturonService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCinturonDto) {
    return this.cinturonService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.cinturonService.remove(id);
  }
}
