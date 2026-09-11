import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Person, PersonDocument } from './schemas/person.schema';

/**
 * Métodos mínimos que necesita el módulo Auth (hito 2). El resto del CRUD de Person
 * (getAll, getMe, getById con las reglas de visibilidad, updateMe, updateById, etc.)
 * se añade en el hito 3, cuando ya existan los guards de roles.
 */
@Injectable()
export class PersonService {
  constructor(
    @InjectModel(Person.name) private readonly personModel: Model<PersonDocument>,
  ) {}

  /** Busca por email sin el password (select:false por defecto en el schema) */
  findByEmail(email: string) {
    return this.personModel.findOne({ email });
  }

  /**
   * Busca por email incluyendo el password. Se usa SOLO en login, donde hace falta
   * comparar el hash con .compararPassword().
   */
  findByEmailWithPassword(email: string) {
    return this.personModel.findOne({ email }).select('+password');
  }

  /** Busca por ID. Lo usa la JwtStrategy para reconstruir request.user desde el token */
  findById(id: string) {
    return this.personModel.findById(id);
  }

  /**
   * Crea una nueva persona. rol se fuerza SIEMPRE a "Atleta" aquí, sin importar qué
   * llegue en `datos` — corrige el bug de seguridad del Express actual, que aceptaba
   * el rol directamente del body de registro.
   */
  create(datos: {
    nombre: string;
    apellidos: string;
    telefono: string;
    email: string;
    password: string;
  }) {
    const nuevaPersona = new this.personModel({ ...datos, rol: 'Atleta' });
    return nuevaPersona.save();
  }
}
