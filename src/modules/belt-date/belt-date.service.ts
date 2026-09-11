import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BeltDate, BeltDateDocument } from "./schemas/belt-date.schema";
import {
  Cinturon,
  CinturonDocument,
} from "../cinturon/schemas/cinturon.schema";
import { CreateBeltDateDto } from "./dto/create-belt-date.dto";
import { UpdateBeltDateDto } from "./dto/update-belt-date.dto";

@Injectable()
export class BeltDateService {
  constructor(
    @InjectModel(BeltDate.name)
    private readonly beltDateModel: Model<BeltDateDocument>,
    @InjectModel(Cinturon.name)
    private readonly cinturonModel: Model<CinturonDocument>,
  ) {}

  getAll() {
    return this.beltDateModel
      .find()
      .populate("cinturon", "color grado")
      .sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const beltDate = await this.beltDateModel
      .findById(id)
      .populate("cinturon", "color grado");
    if (!beltDate) {
      throw new NotFoundException("Registro de cinturón no encontrado");
    }
    return beltDate;
  }

  // POST /api/beltdates — el maestro registra la concesión de un cinturón a un atleta
  async create(dto: CreateBeltDateDto) {
    const cinturonExiste = await this.cinturonModel.findById(dto.cinturon);
    if (!cinturonExiste) {
      throw new BadRequestException("El cinturón especificado no existe");
    }

    // Sin fecha -> hoy. Con fecha -> no puede ser futura (comparando solo fecha, sin hora)
    const fechaFinal = dto.fecha
      ? this.validarFechaNoFuturaCreate(dto.fecha)
      : new Date();

    const nuevoBeltDate = new this.beltDateModel({
      cinturon: dto.cinturon,
      fecha: fechaFinal,
    });
    await nuevoBeltDate.save();
    await nuevoBeltDate.populate("cinturon", "color grado");
    return nuevoBeltDate;
  }

  async update(id: string, dto: UpdateBeltDateDto) {
    if (!dto.cinturon && !dto.fecha) {
      throw new BadRequestException(
        "Debe proporcionar al menos un campo para actualizar (cinturon o fecha)",
      );
    }

    if (dto.cinturon) {
      const cinturonExiste = await this.cinturonModel.findById(dto.cinturon);
      if (!cinturonExiste) {
        throw new BadRequestException("El cinturón especificado no existe");
      }
    }

    if (dto.fecha) {
      this.validarFechaNoFuturaUpdate(dto.fecha);
    }

    const beltDateActualizado = await this.beltDateModel
      .findByIdAndUpdate(id, dto, { new: true, runValidators: true })
      .populate("cinturon", "color grado");

    if (!beltDateActualizado) {
      throw new NotFoundException("Registro de cinturón no encontrado");
    }
    return beltDateActualizado;
  }

  async remove(id: string) {
    const beltDateEliminado = await this.beltDateModel.findByIdAndDelete(id);
    if (!beltDateEliminado) {
      throw new NotFoundException("Registro de cinturón no encontrado");
    }
    return { mensaje: "Registro de cinturón eliminado correctamente" };
  }

  /**
   * Valida que la fecha no sea futura comparando SOLO la fecha (ignora la hora).
   * Usada en create(). Devuelve la fecha ya validada para usarla directamente.
   *
   * Nota: en el Express original, create() pone las horas a 0 antes de comparar pero
   * update() NO lo hacía (ver validarFechaNoFuturaUpdate) — es una inconsistencia que
   * ya existía en el código original; se replica tal cual para no cambiar comportamiento.
   */
  private validarFechaNoFuturaCreate(fecha: string): Date {
    const fechaProporcionada = new Date(fecha);
    const fechaActual = new Date();
    fechaProporcionada.setHours(0, 0, 0, 0);
    fechaActual.setHours(0, 0, 0, 0);

    if (fechaProporcionada > fechaActual) {
      throw new BadRequestException(
        "No se puede registrar una fecha de concesión futura",
      );
    }
    return new Date(fecha);
  }

  /**
   * Misma validación pero SIN poner las horas a 0 (compara fecha+hora exactas),
   * replicando el comportamiento del update() del Express original tal cual.
   */
  private validarFechaNoFuturaUpdate(fecha: string) {
    const fechaProporcionada = new Date(fecha);
    const fechaActual = new Date();

    if (fechaProporcionada > fechaActual) {
      throw new BadRequestException(
        "No se puede registrar una fecha de concesión futura",
      );
    }
  }
}
