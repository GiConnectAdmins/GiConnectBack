import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Clase, ClaseDocument } from "./schemas/clase.schema";
import { CreateClaseDto } from "./dto/create-clase.dto";
import { UpdateClaseDto } from "./dto/update-clase.dto";
import { FindClasesQueryDto } from "./dto/find-clases-query.dto";

@Injectable()
export class ClaseService {
  constructor(
    @InjectModel(Clase.name) private readonly claseModel: Model<ClaseDocument>,
  ) {}

  // GET /api/clases — con filtros opcionales combinables
  getAll(query: FindClasesQueryDto) {
    const filtros: Record<string, unknown> = {};

    if (query.maestro) filtros.maestro = query.maestro;
    if (query.tipo) filtros.tipo = query.tipo;
    if (query.titulo) {
      filtros.titulo = { $regex: query.titulo, $options: "i" };
    }

    return this.claseModel
      .find(filtros)
      .populate("maestro", "nombre apellidos rol")
      .sort({ createdAt: -1 });
  }

  // GET /api/clases/:id
  async getById(id: string) {
    const clase = await this.claseModel
      .findById(id)
      .populate("maestro", "nombre apellidos rol telefono email");

    if (!clase) {
      throw new NotFoundException("Clase no encontrada");
    }
    return clase;
  }

  // POST /api/clases
  async create(dto: CreateClaseDto) {
    this.validarCoherencia(dto.tipo, dto.fecha, dto.diaSemana);

    const nuevaClase = new this.claseModel({
      ...dto,
      fecha: dto.tipo === "especial" ? dto.fecha : undefined,
      diaSemana: dto.tipo === "recurrente" ? dto.diaSemana : undefined,
    });

    await nuevaClase.save();
    await nuevaClase.populate("maestro", "nombre apellidos rol");
    return nuevaClase;
  }

  // PUT /api/clases/:id
  async update(id: string, dto: UpdateClaseDto) {
    const claseExistente = await this.claseModel.findById(id);
    if (!claseExistente) {
      throw new NotFoundException("Clase no encontrada");
    }

    // El tipo/fecha/diaSemana "final" es el que viene en el body, o si no viene,
    // el que ya tenía la clase en la DB — igual que en el controller de Express
    const tipoFinal = dto.tipo || claseExistente.tipo;
    const tieneDiaSemanaFinal =
      dto.diaSemana !== undefined
        ? Boolean(dto.diaSemana)
        : Boolean(claseExistente.diaSemana);
    const tieneFechaFinal =
      dto.fecha !== undefined
        ? Boolean(dto.fecha)
        : Boolean(claseExistente.fecha);

    if (tipoFinal === "recurrente") {
      if (dto.fecha) {
        throw new BadRequestException(
          'Una clase recurrente no puede tener el campo "fecha"',
        );
      }
      if (!tieneDiaSemanaFinal) {
        throw new BadRequestException(
          'Una clase recurrente debe tener el campo "diaSemana"',
        );
      }
    }

    if (tipoFinal === "especial") {
      if (dto.diaSemana) {
        throw new BadRequestException(
          'Una clase especial no puede tener el campo "diaSemana"',
        );
      }
      if (!tieneFechaFinal) {
        throw new BadRequestException(
          'Una clase especial debe tener el campo "fecha"',
        );
      }
    }

    const claseActualizada = await this.claseModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate("maestro", "nombre apellidos rol");

    return claseActualizada;
  }

  // DELETE /api/clases/:id
  async remove(id: string) {
    const claseEliminada = await this.claseModel.findByIdAndDelete(id);
    if (!claseEliminada) {
      throw new NotFoundException("Clase no encontrada");
    }
    return { mensaje: "Clase eliminada correctamente" };
  }

  /** Valida coherencia tipo/fecha/diaSemana al CREAR (misma lógica que el controller Express) */
  private validarCoherencia(tipo: string, fecha?: string, diaSemana?: string) {
    if (tipo === "recurrente") {
      if (!diaSemana) {
        throw new BadRequestException(
          'Una clase recurrente debe tener el campo "diaSemana"',
        );
      }
      if (fecha) {
        throw new BadRequestException(
          'Una clase recurrente no debe tener el campo "fecha"',
        );
      }
    }

    if (tipo === "especial") {
      if (!fecha) {
        throw new BadRequestException(
          'Una clase especial debe tener el campo "fecha"',
        );
      }
      if (diaSemana) {
        throw new BadRequestException(
          'Una clase especial no debe tener el campo "diaSemana"',
        );
      }
    }
  }
}
