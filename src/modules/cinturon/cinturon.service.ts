import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Cinturon, CinturonDocument } from "./schemas/cinturon.schema";
import { CreateCinturonDto } from "./dto/create-cinturon.dto";
import { UpdateCinturonDto } from "./dto/update-cinturon.dto";

@Injectable()
export class CinturonService {
  constructor(
    @InjectModel(Cinturon.name)
    private readonly cinturonModel: Model<CinturonDocument>,
  ) {}

  getAll() {
    return this.cinturonModel.find().sort({ createdAt: -1 });
  }

  async getById(id: string) {
    const cinturon = await this.cinturonModel.findById(id);
    if (!cinturon) {
      throw new NotFoundException("Cinturón no encontrado");
    }
    return cinturon;
  }

  create(dto: CreateCinturonDto) {
    const nuevoCinturon = new this.cinturonModel(dto);
    return nuevoCinturon.save();
  }

  async update(id: string, dto: UpdateCinturonDto) {
    const cinturonActualizado = await this.cinturonModel.findByIdAndUpdate(
      id,
      dto,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!cinturonActualizado) {
      throw new NotFoundException("Cinturón no encontrado");
    }
    return cinturonActualizado;
  }

  async remove(id: string) {
    const cinturonEliminado = await this.cinturonModel.findByIdAndDelete(id);
    if (!cinturonEliminado) {
      throw new NotFoundException("Cinturón no encontrado");
    }
    return { mensaje: "Cinturón eliminado correctamente" };
  }
}
