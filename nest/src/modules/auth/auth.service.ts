import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PersonService } from '../person/person.service';
import { PersonDocument } from '../person/schemas/person.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly personService: PersonService,
    private readonly jwtService: JwtService,
  ) {}

  /** Firma un JWT con el mismo payload que generaba el backend Express: id, email, rol */
  private generarToken(usuario: PersonDocument): string {
    return this.jwtService.sign({
      id: usuario._id,
      email: usuario.email,
      rol: usuario.rol,
    });
  }

  /** Da forma a los datos públicos del usuario en la respuesta (NUNCA incluye el password) */
  private mapUsuarioPublico(usuario: PersonDocument) {
    return {
      id: usuario._id,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  /**
   * POST /api/auth/register
   * Crea un nuevo usuario y devuelve un token JWT. El password se hashea automáticamente
   * en el pre-save del schema. El rol siempre queda como "Atleta" (ver RegisterDto y
   * PersonService.create) sin importar qué se envíe en el body.
   */
  async register(dto: RegisterDto) {
    const yaExiste = await this.personService.findByEmail(dto.email);
    if (yaExiste) {
      throw new BadRequestException('El email ya está registrado');
    }

    const nuevoUsuario = await this.personService.create(dto);

    return {
      mensaje: 'Usuario registrado correctamente',
      token: this.generarToken(nuevoUsuario),
      usuario: this.mapUsuarioPublico(nuevoUsuario),
    };
  }

  /**
   * POST /api/auth/login
   * Verifica credenciales y devuelve un token JWT si son correctas.
   * Usa el mismo mensaje genérico "Credenciales inválidas" tanto si el email no existe
   * como si el password es incorrecto, para no revelar cuál de los dos falló.
   */
  async login(dto: LoginDto) {
    const usuario = await this.personService.findByEmailWithPassword(dto.email);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordCorrecto = await usuario.compararPassword(dto.password);
    if (!passwordCorrecto) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      mensaje: 'Login exitoso',
      token: this.generarToken(usuario),
      usuario: this.mapUsuarioPublico(usuario),
    };
  }
}
