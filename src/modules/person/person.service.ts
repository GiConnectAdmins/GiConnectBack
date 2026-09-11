import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Person, PersonDocument } from "./schemas/person.schema";
import { Equipo, EquipoDocument } from "../equipo/schemas/equipo.schema";
import { UpdateMeDto } from "./dto/update-me.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdatePersonDto } from "./dto/update-person.dto";
import { ChangeRoleDto } from "./dto/change-role.dto";

// Campos que un Maestro puede tocar de un atleta de SU equipo vía PUT /:id.
// "equipo" tiene una regla especial aparte: solo se admite ponerlo a null (ver updateById)
const CAMPOS_MAESTRO_ATLETA = ["suscripcion"] as const;

@Injectable()
export class PersonService {
  constructor(
    @InjectModel(Person.name)
    private readonly personModel: Model<PersonDocument>,
    @InjectModel(Equipo.name)
    private readonly equipoModel: Model<EquipoDocument>,
  ) {}

  // ========================================================================
  // Usados por AuthModule (hito 2)
  // ========================================================================

  findByEmail(email: string) {
    return this.personModel.findOne({ email });
  }

  findByEmailWithPassword(email: string) {
    return this.personModel.findOne({ email }).select("+password");
  }

  findById(id: string) {
    return this.personModel.findById(id);
  }

  create(datos: {
    nombre: string;
    apellidos: string;
    telefono: string;
    email: string;
    password: string;
  }) {
    const nuevaPersona = new this.personModel({ ...datos, rol: "Atleta" });
    return nuevaPersona.save();
  }

  // ========================================================================
  // GET /api/personas — solo Admin
  // ========================================================================

  getAll() {
    return this.personModel
      .find()
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .sort({ createdAt: -1 });
  }

  // ========================================================================
  // GET /api/personas/me
  // ========================================================================

  async getMe(userId: string) {
    const persona = await this.personModel
      .findById(userId)
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .populate("beltDates")
      .populate("afiliacion", "nombre fotoLogo");

    if (!persona) {
      throw new NotFoundException("Usuario no encontrado");
    }
    return persona;
  }

  // ========================================================================
  // GET /api/personas/:id
  // Reglas de visibilidad:
  // - Admin: ve a cualquiera
  // - Cualquiera puede verse a sí mismo
  // - Maestro: ve a sus atletas y a sus co-maestros (mismo equipo)
  // - Atleta: ve solo a sus compañeros de equipo
  // ========================================================================

  async getById(id: string, usuarioActual: PersonDocument) {
    const persona = await this.personModel
      .findById(id)
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .populate("beltDates")
      .populate("afiliacion", "nombre fotoLogo");

    if (!persona) {
      throw new NotFoundException("Persona no encontrada");
    }

    const { rol, _id: usuarioId, equipo: equipoUsuario } = usuarioActual;

    if (rol === "Admin") return persona;
    if (usuarioId.toString() === id) return persona;

    if (rol === "Maestro") {
      // Mongoose castea automáticamente un documento poblado (persona.equipo) a su _id
      // cuando se usa como valor de filtro en una query, igual que hacía el Express actual
      const equipoCompartido = await this.equipoModel.findOne({
        maestrosResponsables: usuarioId,
        $or: [{ _id: persona.equipo }, { maestrosResponsables: persona._id }],
      });

      if (!equipoCompartido) {
        throw new ForbiddenException("No tienes permisos para ver este perfil");
      }
      return persona;
    }

    if (rol === "Atleta") {
      // persona.equipo viene populado (documento completo), hay que comparar por _id
      const equipoPersonaId = (persona.equipo as unknown as { _id?: unknown })
        ?._id;
      const mismoEquipo =
        equipoUsuario &&
        equipoPersonaId &&
        equipoUsuario.toString() === equipoPersonaId.toString();

      if (!mismoEquipo) {
        throw new ForbiddenException("No tienes permisos para ver este perfil");
      }
      return persona;
    }

    throw new ForbiddenException("No tienes permisos para ver este perfil");
  }

  // ========================================================================
  // PUT /api/personas/me
  // ========================================================================

  async updateMe(userId: string, dto: UpdateMeDto) {
    const camposPermitidos = this.quitarUndefined(dto);

    if (Object.keys(camposPermitidos).length === 0) {
      throw new BadRequestException(
        "No se proporcionaron campos válidos para actualizar",
      );
    }

    return this.personModel
      .findByIdAndUpdate(userId, camposPermitidos, {
        new: true,
        runValidators: true,
      })
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado");
  }

  // ========================================================================
  // PUT /api/personas/me/password
  // ========================================================================

  async cambiarPassword(userId: string, dto: ChangePasswordDto) {
    const persona = await this.personModel.findById(userId).select("+password");
    if (!persona) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const esValido = await persona.compararPassword(dto.passwordActual);
    if (!esValido) {
      throw new UnauthorizedException("El password actual es incorrecto");
    }

    // El pre-save del schema hashea automáticamente el nuevo password
    persona.password = dto.passwordNuevo;
    await persona.save();

    return { mensaje: "Password actualizado correctamente" };
  }

  // ========================================================================
  // PUT /api/personas/:id
  // Admin: puede tocar cualquier campo del DTO (ya excluye email/password/rol/contadores)
  // Maestro: solo atletas de SU equipo, y solo "suscripcion" + "equipo: null"
  // Atleta: sin acceso, debe usar /me
  // ========================================================================

  async updateById(
    id: string,
    dto: UpdatePersonDto,
    usuarioActual: PersonDocument,
  ) {
    const { rol: rolUsuario, _id: usuarioId } = usuarioActual;

    if (rolUsuario === "Atleta") {
      throw new ForbiddenException(
        "No tienes permisos para esta acción. Usa PUT /api/personas/me para editar tu propio perfil",
      );
    }

    const persona = await this.personModel.findById(id);
    if (!persona) {
      throw new NotFoundException("Persona no encontrada");
    }

    let camposPermitidos: Record<string, unknown> = {};

    if (rolUsuario === "Admin") {
      camposPermitidos = this.quitarUndefined(dto);
    } else if (rolUsuario === "Maestro") {
      // El atleta debe pertenecer a un equipo del que este Maestro sea responsable
      const equipoDelAtleta = await this.equipoModel.findOne({
        _id: persona.equipo,
        maestrosResponsables: usuarioId,
      });

      if (!equipoDelAtleta) {
        throw new ForbiddenException(
          "Solo puedes modificar atletas de tu equipo",
        );
      }

      CAMPOS_MAESTRO_ATLETA.forEach((campo) => {
        if (dto[campo] !== undefined) {
          camposPermitidos[campo] = dto[campo];
        }
      });

      // equipo: el Maestro solo puede ponerlo a null (expulsar). Para asignar equipo
      // el atleta debe enviar una SolicitudEquipo (hito 7).
      if (dto.equipo !== undefined) {
        if (dto.equipo !== null) {
          throw new BadRequestException(
            "Para asignar un equipo a un atleta este debe enviar una solicitud. Solo puedes quitarle el equipo (equipo: null)",
          );
        }
        camposPermitidos.equipo = null;
      }

      if (Object.keys(camposPermitidos).length === 0) {
        throw new BadRequestException(
          "No se proporcionaron campos válidos para actualizar",
        );
      }
    }

    return this.personModel
      .findByIdAndUpdate(id, camposPermitidos, {
        new: true,
        runValidators: true,
      })
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado");
  }

  // ========================================================================
  // PUT /api/personas/:id/rol — solo Admin
  // ========================================================================

  async cambiarRol(id: string, dto: ChangeRoleDto) {
    const personaActualizada = await this.personModel.findByIdAndUpdate(
      id,
      { rol: dto.rol },
      { new: true, runValidators: true },
    );

    if (!personaActualizada) {
      throw new NotFoundException("Persona no encontrada");
    }
    return personaActualizada;
  }

  // ========================================================================
  // DELETE /api/personas/:id — solo Admin
  // ========================================================================

  async remove(id: string, usuarioActualId: string) {
    if (usuarioActualId === id) {
      throw new BadRequestException("No puedes eliminar tu propia cuenta");
    }

    const personaEliminada = await this.personModel.findByIdAndDelete(id);
    if (!personaEliminada) {
      throw new NotFoundException("Persona no encontrada");
    }

    return { mensaje: "Persona eliminada correctamente" };
  }

  // ========================================================================
  // PUT /api/equipos/:id/reset-clases-impartidas (vive en EquipoController, hito 4)
  // Nota histórica: en el Express actual este endpoint monta bajo /api/equipos pero
  // la lógica vivía en person.controller.js. Aquí se mantiene igual: EquipoService
  // llama a este método inyectando PersonService, en vez de tocar el modelo Person
  // directamente desde otro módulo.
  // ========================================================================

  async resetClasesImpartidas(
    personIds: (Types.ObjectId | string)[],
  ): Promise<number> {
    const resultado = await this.personModel.updateMany(
      { _id: { $in: personIds } },
      { clasesImpartidas: 0 },
    );
    return resultado.modifiedCount;
  }

  /** Quita las claves con valor undefined (para no sobreescribir campos sin querer) */
  private quitarUndefined(obj: object): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== undefined),
    );
  }
}
