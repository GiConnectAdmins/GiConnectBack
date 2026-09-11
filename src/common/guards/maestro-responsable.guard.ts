import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Equipo,
  EquipoDocument,
} from "../../modules/equipo/schemas/equipo.schema";

/**
 * Reemplaza a verificarMaestroResponsable() de Express.
 *
 * Debe usarse SIEMPRE después de JwtAuthGuard (necesita request.user ya adjuntado).
 * Los Admin pasan siempre sin restricción. Un Maestro solo pasa si figura en
 * maestrosResponsables del equipo indicado por el parámetro de ruta :id.
 *
 * Solo puede usarse en providers de un módulo que registre el modelo Equipo
 * (@InjectModel necesita que MongooseModule.forFeature(Equipo) esté disponible).
 */
@Injectable()
export class MaestroResponsableGuard implements CanActivate {
  constructor(
    @InjectModel(Equipo.name)
    private readonly equipoModel: Model<EquipoDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user, params } = request;

    if (user.rol === "Admin") {
      return true;
    }

    const equipo = await this.equipoModel.findById(params.id);
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const esMaestroResponsable = equipo.maestrosResponsables.some(
      (maestroId) => maestroId.toString() === user._id.toString(),
    );

    if (!esMaestroResponsable) {
      throw new ForbiddenException(
        "No eres maestro responsable de este equipo",
      );
    }

    return true;
  }
}
