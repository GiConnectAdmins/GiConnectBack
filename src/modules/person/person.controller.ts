import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import { PersonService } from "./person.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import type { PersonDocument } from "./schemas/person.schema";
import { UpdateMeDto } from "./dto/update-me.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { ChangeRoleDto } from "./dto/change-role.dto";

@Controller("personas")
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  // GET /api/personas — solo Admin
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  getAll() {
    return this.personService.getAll();
  }

  // GET /api/personas/me — declarado ANTES de ':id' para que no se confunda "me" con un ID
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: PersonDocument) {
    return this.personService.getMe(user._id.toString());
  }

  // PUT /api/personas/me
  @Put("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: PersonDocument, @Body() dto: UpdateMeDto) {
    return this.personService.updateMe(user._id.toString(), dto);
  }

  // PUT /api/personas/me/password
  @Put("me/password")
  @UseGuards(JwtAuthGuard)
  cambiarPassword(
    @CurrentUser() user: PersonDocument,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.personService.cambiarPassword(user._id.toString(), dto);
  }

  // GET /api/personas/:id — reglas de visibilidad, ver PersonService.getById
  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getById(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: PersonDocument,
  ) {
    return this.personService.getById(id, user);
  }

  // PUT /api/personas/:id/rol — solo Admin
  @Put(":id/rol")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  cambiarRol(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.personService.cambiarRol(id, dto);
  }

  // PUT /api/personas/:id — Admin o Maestro (Atleta recibe 403 desde el servicio)
  @Put(":id")
  @UseGuards(JwtAuthGuard)
  updateById(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: PersonDocument,
  ) {
    return this.personService.updateById(id, dto, user);
  }

  // DELETE /api/personas/:id — solo Admin
  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("Admin")
  remove(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: PersonDocument,
  ) {
    return this.personService.remove(id, user._id.toString());
  }
}
