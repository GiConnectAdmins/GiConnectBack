import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Equipo, EquipoDocument } from "./schemas/equipo.schema";
import { PersonService } from "../person/person.service";
import { CreateEquipoDto } from "./dto/create-equipo.dto";
import { UpdateEquipoDto } from "./dto/update-equipo.dto";

@Injectable()
export class EquipoService {
  constructor(
    @InjectModel(Equipo.name)
    private readonly equipoModel: Model<EquipoDocument>,
    private readonly personService: PersonService,
  ) {}

  // GET /api/equipos
  getAll() {
    return this.equipoModel.find().sort({ createdAt: -1 });
  }

  // GET /api/equipos/:id
  async getById(id: string) {
    const equipo = await this.equipoModel
      .findById(id)
      .populate("afiliacion", "nombre direccion telefono fotoLogo");

    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }
    return equipo;
  }

  // POST /api/equipos — solo Admin (ver EquipoController)
  create(dto: CreateEquipoDto) {
    const nuevoEquipo = new this.equipoModel(dto);
    return nuevoEquipo.save();
  }

  // PUT /api/equipos/:id — Admin o Maestro responsable (MaestroResponsableGuard)
  // dto ya viene whitelistado por el ValidationPipe global: no puede contener
  // maestrosResponsables aunque se envíe en el body (corrige el bug de mass-assignment)
  async update(id: string, dto: UpdateEquipoDto) {
    const equipoActualizado = await this.equipoModel.findByIdAndUpdate(
      id,
      dto,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!equipoActualizado) {
      throw new NotFoundException("Equipo no encontrado");
    }
    return equipoActualizado;
  }

  // DELETE /api/equipos/:id — solo Admin
  async remove(id: string) {
    const equipoEliminado = await this.equipoModel.findByIdAndDelete(id);
    if (!equipoEliminado) {
      throw new NotFoundException("Equipo no encontrado");
    }
    return { mensaje: "Equipo eliminado correctamente" };
  }

  // PUT /api/equipos/:id/reset-clases-impartidas — Admin o Maestro responsable
  // (permisos ya verificados por MaestroResponsableGuard antes de llegar aquí)
  async resetClasesImpartidas(equipoId: string) {
    const equipo = await this.equipoModel.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const maestrosActualizados = await this.personService.resetClasesImpartidas(
      equipo.maestrosResponsables,
    );

    return {
      mensaje: "Clases impartidas reseteadas correctamente",
      maestrosActualizados,
    };
  }
}
