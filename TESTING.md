# Registro de tests unitarios (Jest)

> Registro de qué está cubierto con tests y qué falta, para retomar sin perder contexto
> (mismo criterio que [PROGRESS.md](PROGRESS.md)). Se actualiza cada vez que se añaden
> o se dejan de añadir tests a un módulo.

## Contexto

Hasta ahora la infraestructura de test (Jest, vía `npm test` / `npm run test:cov`)
estaba montada pero solo tenía el `.spec.ts` boilerplate que genera `nest new`
(`app.controller.spec.ts`), sin tests de lógica de negocio real. Se añadieron tests
unitarios para los 7 servicios de módulo y los 2 guards con lógica propia.

**Alcance deliberado**: son tests **unitarios de servicios y guards**, con los modelos
de Mongoose (`Model<T>`) y dependencias (`PersonService`, `JwtService`) mockeados a
mano con `jest.fn()` — no tests de integración/e2e contra una base de datos real, ni
tests de controllers (que apenas tienen lógica: delegan en el servicio) ni de DTOs
(la validación de `class-validator` es declarativa, se confía en el framework). Es la
proporción de esfuerzo/valor razonable para lo que hay ahora mismo.

## Fix de configuración necesario

`@nestjs/mongoose@12` y `@nestjs/jwt@12` se publican como **ESM puro** (`"type":
"module"`, sin build CJS). Jest con `ts-jest` no podía hacer `require()` de esos
paquetes y todos los tests que importaban un servicio con `@InjectModel` o
`JwtService` fallaban al arrancar (`Must use import to load ES Module`). Se arregló
sin tocar código de negocio, con dos cambios de configuración:

- [tsconfig.jest.json](tsconfig.jest.json) — variante de `tsconfig.json` solo para
  tests: `module: commonjs`, `moduleResolution: node` (en vez de `nodenext`).
- [package.json](package.json) — el bloque `"jest"` ahora usa ese tsconfig y añade
  `transformIgnorePatterns` para que `ts-jest` sí transforme esos dos paquetes dentro
  de `node_modules` (por defecto Jest los ignora).

Esto no afecta al build de producción (`nest build` sigue usando `tsconfig.json` con
`nodenext` tal cual).

## Cobertura por módulo

| Módulo | Archivo de test | Qué verifica |
|---|---|---|
| Auth | [auth.service.spec.ts](src/modules/auth/auth.service.spec.ts) | Registro rechaza email duplicado; login usa el mismo mensaje genérico tanto si el email no existe como si el password es incorrecto (no filtra cuál falló); el password nunca sale en la respuesta; el JWT se firma con `{ id, email, rol }`. |
| Person | [person.service.spec.ts](src/modules/person/person.service.spec.ts) | Las 4 reglas de visibilidad de `getById` (Admin ve a todos, cualquiera se ve a sí mismo, Maestro solo a su equipo/co-maestros, Atleta solo a compañeros de equipo); permisos de `updateById` por rol (Atleta bloqueado, Maestro limitado a `suscripcion` y a poner `equipo: null`, Admin sin restricción de campos); `cambiarPassword` valida el password actual; `remove` impide auto-eliminación. |
| Equipo | [equipo.service.spec.ts](src/modules/equipo/equipo.service.spec.ts) | 404 en getById/update/remove sobre IDs inexistentes; `update` reenvía el DTO tal cual (la protección contra mass-assignment de `maestrosResponsables` vive en el DTO, no en el servicio); `resetClasesImpartidas` delega correctamente en `PersonService`. |
| Clase | [clase.service.spec.ts](src/modules/clase/clase.service.spec.ts) | Filtros combinables de `getAll` (incluye regex case-insensitive en `titulo`); coherencia tipo/fecha/diaSemana al crear (las 4 combinaciones inválidas) y al actualizar (coherencia contra el estado ya guardado en DB, no solo contra el body). |
| Cinturon | [cinturon.service.spec.ts](src/modules/cinturon/cinturon.service.spec.ts) | CRUD básico y sus 404. |
| BeltDate | [belt-date.service.spec.ts](src/modules/belt-date/belt-date.service.spec.ts) | Rechaza cinturón inexistente y fecha futura; cubre la inconsistencia ya documentada en el código entre `create` (compara solo fecha, sin hora) y `update` (compara fecha+hora exacta) — se testea tal cual está, sin "corregirla" por sorpresa. |
| SolicitudEquipo | [solicitud-equipo.service.spec.ts](src/modules/solicitud-equipo/solicitud-equipo.service.spec.ts) | Rechaza duplicados pendientes y equipos sin `maestrosResponsables`; permisos de `aceptar`/`rechazar` (Admin o Maestro responsable, solo si sigue "pendiente"); efecto de `aceptar` según `tipo` (`equipo` asigna equipo principal, `afiliacion` hace `$addToSet`); `rechazar` no toca el equipo del atleta. |
| Guards | [roles.guard.spec.ts](src/common/guards/roles.guard.spec.ts), [maestro-responsable.guard.spec.ts](src/common/guards/maestro-responsable.guard.spec.ts) | `RolesGuard`: deja pasar sin `@Roles()`, 401 sin usuario, 403 con rol no permitido. `MaestroResponsableGuard`: Admin pasa siempre, 404 si el equipo no existe, 403 si el Maestro no es responsable de ese equipo. |
| Pipes | [parse-object-id.pipe.spec.ts](src/common/pipes/parse-object-id.pipe.spec.ts) | ObjectId válido/inválido/vacío. |

**Resultado:** 88 tests, 11 suites, todas en verde. ~48% de statements cubiertos en
`src/` (antes, contando solo el boilerplate, era prácticamente 0% de lógica real).

## Pendiente (no incluido en esta pasada)

- **Controllers**: apenas tienen lógica (delegan en el servicio); si se testean, sería
  más valioso como e2e con `supertest` (`test:e2e`, ya configurado pero sin specs)
  contra una base de datos de test, no como unitario aislado.
- **Guards de infraestructura pura**: `JwtAuthGuard` y `ThrottlerGuard` son casi 100%
  wiring de Passport/`@nestjs/throttler` — bajo valor unitario, se confía en el
  framework como pide la convención del proyecto.
- **`main.ts`, `configuration.ts`, `env.validation.ts`**: arranque/config, se prueban
  mejor arrancando la app (ya se hizo manualmente en cada hito, ver PROGRESS.md) que
  con un unitario.
- **Frontend (`GiConnectFront`)**: revisado — de momento solo existe el esqueleto que
  genera el CLI de Ionic/Angular (`AppComponent`, `HomePage`, sin servicios ni lógica
  propia todavía), con sus `.spec.ts` de plantilla ya presentes. No se ha añadido nada
  ahí porque no hay lógica real que testear aún; en cuanto conecte con la API del
  backend (auth, listados, etc.) es el momento de escribir tests de esos servicios y
  componentes.

## Cómo correrlos

```bash
npm test              # una vez
npm run test:watch    # modo watch
npm run test:cov       # con tabla de cobertura (carpeta coverage/, no se commitea)
```
