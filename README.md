# GiConnect — Backend

API REST para GiConnect, una aplicación de gestión de gimnasios y academias de artes marciales: control de alumnos, cinturones, clases, solicitudes de ingreso a equipo y autenticación por roles.

## Stack tecnológico

- **[NestJS 11](https://nestjs.com/)** (Node.js + TypeScript) — framework backend
- **MongoDB Atlas + Mongoose** (vía `@nestjs/mongoose`) — base de datos
- **JWT** (`@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`) — autenticación
- **class-validator / class-transformer** — validación y transformación de DTOs
- **Helmet** — cabeceras de seguridad HTTP
- **@nestjs/throttler** — rate limiting (anti fuerza bruta en login)
- **Joi** (vía `@nestjs/config`) — validación de variables de entorno al arrancar

> El backend original se construyó con Express y se migró por completo a NestJS (ver [PROGRESS.md](./PROGRESS.md) para el detalle de esa migración). El comportamiento de la API es equivalente al backend Express original: mismas rutas, mismos códigos de estado, mismos mensajes de error.

## Estructura del proyecto

```
src/
  main.ts                 # bootstrap: helmet, CORS, ValidationPipe global, filtro de excepciones
  app.module.ts            # módulo raíz: config, conexión Mongo, rate limiting, módulos de dominio
  app.controller.ts        # GET / — ruta de comprobación de estado

  config/
    configuration.ts       # config tipada leída de process.env
    env.validation.ts      # esquema Joi de variables de entorno obligatorias/opcionales

  common/                  # piezas transversales reutilizadas por todos los módulos
    decorators/
      current-user.decorator.ts   # @CurrentUser() — extrae el usuario autenticado
      roles.decorator.ts          # @Roles('Admin', 'Maestro') — metadata de permisos
    guards/
      jwt-auth.guard.ts           # exige un JWT válido (Bearer token)
      roles.guard.ts              # exige que el usuario tenga uno de los roles permitidos
      maestro-responsable.guard.ts # exige ser Admin o Maestro responsable del equipo del :id
      throttler.guard.ts          # rate limiting con mensajes en español
    pipes/
      parse-object-id.pipe.ts     # valida que un :id de ruta sea un ObjectId de Mongo válido
    filters/
      all-exceptions.filter.ts    # normaliza TODOS los errores a { mensaje: string }

  modules/
    auth/               # registro y login (públicos), estrategia JWT
    person/             # personas: perfiles, roles, permisos (Admin/Maestro/Atleta)
    equipo/             # equipos/dojos: CRUD, maestros responsables
    clase/               # clases (recurrentes o especiales), filtros de búsqueda
    cinturon/            # catálogo de cinturones (color + grado)
    belt-date/           # concesión de cinturones a atletas (con fecha)
    solicitud-equipo/    # solicitudes de un atleta para unirse/afiliarse a un equipo

test/
  app.e2e-spec.ts        # test e2e de la ruta raíz (base para ampliar en el futuro)
```

Cada módulo de dominio sigue la misma forma: `*.module.ts` (wiring), `*.controller.ts` (rutas HTTP, fino), `*.service.ts` (lógica de negocio), `schemas/*.schema.ts` (modelo Mongoose con `@Schema()`/`@Prop()`), `dto/*.dto.ts` (validación de entrada).

## Requisitos previos

- Node.js 22+ y npm
- Una base de datos MongoDB Atlas (o local) accesible

## Instalación

```bash
npm install
cp .env.example .env   # y rellena los valores reales (ver abajo)
npm run start:dev
```

El servidor arranca por defecto en el puerto definido en `PORT` (3000).

## Variables de entorno

Definidas en `.env` (nunca se commitea; usa `.env.example` como plantilla) y validadas al arrancar con Joi — si falta una obligatoria, el servidor no arranca y avisa con un mensaje claro.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (default `3000`) | Puerto HTTP del servidor |
| `MONGO_URI` | **Sí** | Connection string de MongoDB Atlas |
| `JWT_SECRET` | **Sí** | Clave secreta para firmar/verificar los JWT |
| `JWT_EXPIRES_IN` | No (default `7d`) | Duración de validez de los tokens |
| `NODE_ENV` | No (default `development`) | Entorno de ejecución |
| `FRONTEND_URL` | No | Origen permitido para CORS en producción. Sin definir, CORS acepta cualquier origen (modo desarrollo) |

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Arranca en modo desarrollo con recarga automática (equivalente al antiguo `nodemon`) |
| `npm run start` | Arranca sin recarga automática |
| `npm run start:prod` | Arranca desde el build compilado (`dist/`) — requiere `npm run build` antes |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run lint` | Linter con autofix |
| `npm run format` | Formatea el código con Prettier (comillas dobles) |
| `npm test` | Tests unitarios (Jest) |
| `npm run test:e2e` | Tests end-to-end |

## Autenticación y roles

Login vía `POST /api/auth/login` devuelve un JWT (`Authorization: Bearer <token>`). Tres roles: **Admin**, **Maestro**, **Atleta** (rol por defecto al registrarse — el registro público nunca puede elegir su propio rol; un Admin lo cambia después vía `PUT /api/personas/:id/rol`).

Cada ruta protegida usa `@UseGuards(JwtAuthGuard)` y, si necesita restringir por rol, además `@UseGuards(JwtAuthGuard, RolesGuard)` con `@Roles(...)`. Las rutas que dependen de "ser responsable de un equipo concreto" (p. ej. editar un Equipo, o resetear las clases impartidas de sus maestros) usan `MaestroResponsableGuard`, que deja pasar siempre a Admin y solo a los Maestros que figuren en `maestrosResponsables` de ese equipo.

## Módulos y permisos (resumen)

| Módulo | Ruta base | Notas de permisos |
|---|---|---|
| Auth | `/api/auth` | `register` y `login` públicos |
| Person | `/api/personas` | Ver perfil propio: cualquiera autenticado. Listar todo: solo Admin. Reglas de visibilidad y edición según rol (ver `person.service.ts`) |
| Equipo | `/api/equipos` | Crear: solo Admin. Editar: Admin o Maestro responsable. Eliminar: solo Admin. Leer: cualquier autenticado |
| Clase | `/api/clases` | Leer: cualquier autenticado. Crear/editar/eliminar: Admin o Maestro |
| Cinturon | `/api/cinturones` | Catálogo fijo — escritura solo Admin |
| BeltDate | `/api/beltdates` | Crear/editar: Admin o Maestro (conceden cinturones a sus atletas). Eliminar: solo Admin |
| SolicitudEquipo | `/api/solicitudes-equipo` | Crear y ver propias: solo Atleta. Gestionar (ver pendientes, aceptar, rechazar): Admin o Maestro responsable del equipo |

## Errores y validación

Todas las respuestas de error siguen el mismo contrato: `{ "mensaje": "..." }` (nunca el formato por defecto de Nest). Un único filtro global (`AllExceptionsFilter`) centraliza esto, incluyendo los errores de validación de Mongoose y los de `class-validator`.

Los DTOs usan `class-validator` con un `ValidationPipe` global en modo `whitelist` (descarta cualquier campo no declarado en el DTO) — esto es, entre otras cosas, lo que impide el *mass assignment* en las rutas de actualización.

## Estado del proyecto

Ver [PROGRESS.md](./PROGRESS.md) para el histórico de la migración a NestJS y qué queda pendiente del roadmap general (tickets en Trello).
