import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { BeltDateService } from './belt-date.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CreateBeltDateDto } from './dto/create-belt-date.dto';
import { UpdateBeltDateDto } from './dto/update-belt-date.dto';

@Controller('beltdates')
export class BeltDateController {
  constructor(private readonly beltDateService: BeltDateService) {}

  // GET — sin auth todavía, igual que en Express hoy (se cierra en el hito 8)
  @Get()
  getAll() {
    return this.beltDateService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.beltDateService.getById(id);
  }

  // POST/PUT — Admin y Maestro: es como un Maestro concede un cinturón a su atleta
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Maestro')
  create(@Body() dto: CreateBeltDateDto) {
    return this.beltDateService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Maestro')
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateBeltDateDto) {
    return this.beltDateService.update(id, dto);
  }

  // DELETE — solo Admin (borrar un histórico de cinturón es más sensible)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.beltDateService.remove(id);
  }
}
