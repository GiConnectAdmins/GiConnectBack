import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SolicitudEquipo, SolicitudEquipoDocument } from './schemas/solicitud-equipo.schema';
import { Person, PersonDocument } from '../person/schemas/person.schema';
import { Equipo, EquipoDocument } from '../equipo/schemas/equipo.schema';
import { CreateSolicitudEquipoDto } from './dto/create-solicitud-equipo.dto';
import { RespondSolicitudEquipoDto } from './dto/respond-solicitud-equipo.dto';

@Injectable()
export class SolicitudEquipoService {
  constructor(
    @InjectModel(SolicitudEquipo.name)
    private readonly solicitudModel: Model<SolicitudEquipoDocument>,
    @InjectModel(Person.name) private readonly personModel: Model<PersonDocument>,
    @InjectModel(Equipo.name) private readonly equipoModel: Model<EquipoDocument>,
  ) {}

  // POST /api/solicitudes-equipo — el atleta autenticado solicita unirse/afiliarse
  async create(atletaId: string, dto: CreateSolicitudEquipoDto) {
    // ===== Validación 1: evitar solicitudes duplicadas =====
    // (antes vivía en el pre-save del modelo; movida aquí con el mismo mensaje)
    const solicitudExistente = await this.solicitudModel.findOne({
      atleta: atletaId,
      equipo: dto.equipo,
      tipo: dto.tipo,
      estado: 'pendiente',
    } as Record<string, unknown>);
    if (solicitudExistente) {
      throw new BadRequestException(
        `Ya tienes una solicitud de ${dto.tipo} pendiente para este equipo`,
      );
    }

    // ===== Validación 2: el equipo debe existir y tener maestros responsables =====
    // Equipos sin maestrosResponsables son de referencia/publicidad: no aceptan solicitudes
    const equipo = await this.equipoModel.findById(dto.equipo);
    if (!equipo) {
      throw new BadRequestException('El equipo no existe');
    }
    if (!equipo.maestrosResponsables || equipo.maestrosResponsables.length === 0) {
      throw new BadRequestException(
        'Este equipo no acepta solicitudes (equipo de referencia/publicidad)',
      );
    }

    const nuevaSolicitud = new this.solicitudModel({
      atleta: atletaId,
      equipo: dto.equipo,
      tipo: dto.tipo,
      mensaje: dto.mensaje,
    });

    await nuevaSolicitud.save();
    await nuevaSolicitud.populate('equipo', 'nombre fotoLogo');
    return nuevaSolicitud;
  }

  // GET /api/solicitudes-equipo/mias — historial propio del atleta (cualquier estado)
  getMisSolicitudes(atletaId: string) {
    return this.solicitudModel
      .find({ atleta: atletaId })
      .populate('equipo', 'nombre fotoLogo')
      .sort({ fechaSolicitud: -1 });
  }

  // GET /api/solicitudes-equipo/equipo/:equipoId — Admin o Maestro responsable de ESE equipo
  async getPendientesPorEquipo(equipoId: string, usuarioActual: PersonDocument) {
    const equipo = await this.equipoModel.findById(equipoId);
    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    if (usuarioActual.rol !== 'Admin') {
      const esMaestroResponsable = equipo.maestrosResponsables.some(
        (maestroId) => maestroId.toString() === usuarioActual._id.toString(),
      );
      if (!esMaestroResponsable) {
        throw new ForbiddenException('No eres maestro responsable de este equipo');
      }
    }

    return this.solicitudModel
      .find({ equipo: equipoId, estado: 'pendiente' })
      .populate('atleta', 'nombre apellidos email foto')
      .sort({ fechaSolicitud: -1 });
  }

  // PUT /api/solicitudes-equipo/:id/aceptar
  async aceptar(id: string, usuarioActual: PersonDocument, dto: RespondSolicitudEquipoDto) {
    const solicitud = await this.obtenerSolicitudParaResponder(id, usuarioActual);

    solicitud.estado = 'aceptada';
    solicitud.fechaRespuesta = new Date();
    solicitud.respuestaMaestro = dto.respuestaMaestro || 'Solicitud aceptada';
    await solicitud.save();

    // Según el tipo: asigna el equipo principal (único) o añade a afiliaciones (array)
    if (solicitud.tipo === 'equipo') {
      await this.personModel.findByIdAndUpdate(solicitud.atleta, { equipo: solicitud.equipo });
    } else if (solicitud.tipo === 'afiliacion') {
      await this.personModel.findByIdAndUpdate(solicitud.atleta, {
        $addToSet: { afiliacion: solicitud.equipo },
      });
    }

    await solicitud.populate('equipo', 'nombre fotoLogo');
    await solicitud.populate('atleta', 'nombre apellidos email');
    return solicitud;
  }

  // PUT /api/solicitudes-equipo/:id/rechazar
  async rechazar(id: string, usuarioActual: PersonDocument, dto: RespondSolicitudEquipoDto) {
    const solicitud = await this.obtenerSolicitudParaResponder(id, usuarioActual);

    solicitud.estado = 'rechazada';
    solicitud.fechaRespuesta = new Date();
    solicitud.respuestaMaestro = dto.respuestaMaestro || 'Solicitud rechazada';
    await solicitud.save();
    // NO se toca el campo equipo del atleta: sigue sin equipo o con el que ya tuviera

    await solicitud.populate('equipo', 'nombre fotoLogo');
    await solicitud.populate('atleta', 'nombre apellidos email');
    return solicitud;
  }

  /**
   * Carga la solicitud y valida: que exista, que siga pendiente, y que quien responde
   * sea Admin o Maestro responsable del equipo de la solicitud. Común a aceptar/rechazar.
   */
  private async obtenerSolicitudParaResponder(id: string, usuarioActual: PersonDocument) {
    const solicitud = await this.solicitudModel.findById(id);
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(`Esta solicitud ya fue ${solicitud.estado}`);
    }

    if (usuarioActual.rol !== 'Admin') {
      const equipo = await this.equipoModel.findOne({
        _id: solicitud.equipo,
        maestrosResponsables: usuarioActual._id,
      });
      if (!equipo) {
        throw new ForbiddenException('No eres maestro responsable de este equipo');
      }
    }

    return solicitud;
  }
}
