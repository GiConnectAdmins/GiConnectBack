import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/register — pública. 201 es el código por defecto de Nest en POST.
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // POST /api/auth/login — pública. Se fuerza 200 porque Nest devolvería 201 por defecto
  // en un POST, y el Express actual devuelve 200 en login.
  //
  // Rate limiting estricto (T21: anti fuerza bruta): máximo 5 intentos por IP cada 60s,
  // mucho más restrictivo que el límite global de 100/60s del resto de la API.
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
