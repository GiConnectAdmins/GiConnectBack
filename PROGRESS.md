# Progreso: migración Express → NestJS (Ticket 17)

> Este archivo existe para que cualquier sesión de Claude Code (en este Mac, en el
> Windows de casa, o donde sea) pueda retomar el trabajo sin perder contexto, y para
> que Daniel tenga un registro de qué se hizo y por qué. Se actualiza al final de cada
> hito. Cuando la migración esté 100% cerrada y mergeada a `develop`, este archivo se
> puede borrar (su contenido histórico queda en el log de git de todas formas).

## Contexto

Daniel decidió migrar el backend completo de Express a NestJS (TypeScript) antes de
seguir con el roadmap normal de tickets (T20 en adelante), priorizando el valor de
portfolio de cara a entrevistas de trabajo. Es una migración de framework, sin cambios
de comportamiento: mismas rutas, mismos códigos de estado, mismos mensajes de error.
Como efecto colateral se resolvieron 4 pendientes de seguridad ya documentados:
Ticket 21 (auth en rutas abiertas + helmet + rate limiting) y 3 bugs (rol en registro,
mass-assignment en Equipo, CORS abierto).

**Rama de trabajo:** `ticket-17`, creada desde `develop`. Es un único ticket en Trello,
así que va todo en **una sola rama** con **un commit por hito**, y al final **un único
PR** `ticket-17 → develop`.

## Estado: hitos 1-9 completados y verificados. Hito 10 en curso.

Cada hito se verificó manualmente levantando el servidor y probando con `curl` contra
la base de datos real de MongoDB Atlas (no existe una colección Postman en este repo —
se buscó y no está, así que la verificación fue exhaustiva caso por caso, más rigurosa
que una colección estática). Después de cada hito se limpiaron los datos de prueba.

- [x] **Hito 1** — Scaffold NestJS (patrón *strangler fig*: convivió con Express en un
  puerto distinto durante toda la migración), config validada con Joi, conexión a
  MongoDB Atlas, filtro global de excepciones (`{ mensaje }` para todo), ValidationPipe
  global, helmet, CORS configurable.
- [x] **Hito 2** — Módulo Auth (register/login) + schema base de Person. Corrige el bug
  de seguridad "cualquiera puede registrarse como Admin": el DTO de registro no admite
  `rol` y el servicio lo fuerza siempre a `"Atleta"`.
- [x] **Hito 3** — Módulo Person completo: las 4 reglas de visibilidad (Admin/self/
  Maestro-de-mi-equipo/Atleta-mismo-equipo), permisos de edición por rol, guards
  (`JwtAuthGuard`, `RolesGuard`), pipe `ParseObjectIdPipe`.
- [x] **Hito 4** — Módulo Equipo: DTOs con whitelist (corrige el mass-assignment de
  `maestrosResponsables`), `MaestroResponsableGuard`, endpoint
  `reset-clases-impartidas`. Permisos: crear solo Admin, editar Admin o Maestro
  responsable, eliminar solo Admin.
- [x] **Hito 5** — Módulo Clase: validación de coherencia tipo/fecha/diaSemana,
  filtros de búsqueda (`maestro`, `tipo`, `titulo`). Lectura: cualquier autenticado.
  Escritura: Admin y Maestro.
- [x] **Hito 6** — Módulos Cinturon (catálogo, solo Admin en escritura) y BeltDate
  (Admin y Maestro conceden cinturones, solo Admin elimina).
- [x] **Hito 7** — Módulo SolicitudEquipo: la lógica de `aceptar()`/`rechazar()`/
  validación de duplicados se trasladó del modelo Mongoose (que hacía `require()`
  manual) al servicio, con inyección de dependencias limpia.
- [x] **Hito 8** — Endurecimiento de seguridad transversal: auth añadida a las rutas
  GET que quedaban abiertas (Equipo, Cinturon, BeltDate), rate limiting en login
  (5 intentos/60s, mensaje en español). **Esto cierra el Ticket 21**, ya movido a
  "Validado" en Trello.
- [x] **Hito 9** — Punto de corte: `nest/` promovido a la raíz del repo, Express viejo
  eliminado (`server.js`, `src/app.js`, controllers/routes/middlewares/models
  antiguos), `package.json` fusionado, verificado que arranca y responde igual en el
  puerto 3000 real. Sin referencias huérfanas al árbol viejo.
- [ ] **Hito 10** (en curso) — README.md completo (hecho), este PROGRESS.md (hecho).
  Queda: revisar todo una vez más en conjunto y hacer el PR final.

## Pendiente después de cerrar la migración

1. Terminar hito 10 y hacer el PR `ticket-17 → develop` (con descripción completa).
2. Una vez mergeado: cerrar en Trello los tickets ya resueltos como efecto colateral
   (T21 ya está en "Validado"; revisar si quedan los 2 bugs de mass-assignment/rol
   como tarjetas sueltas que cerrar, o si ya estaban implícitos en T21).
3. Retomar el roadmap normal desde T20 (script seed de cinturones) — pero **ya en
   NestJS**, siguiendo los mismos patrones establecidos en esta migración (DTOs con
   class-validator, servicios con lógica de negocio, guards para permisos).

## Particularidades a tener en cuenta (para no redescubrirlas)

- **Mongoose + TypeScript + union types**: un `@Prop()` sobre un campo tipado como
  union de literales (`'Admin' | 'Maestro' | 'Atleta'`, o cualquier union con `| null`)
  necesita `type: String` explícito en las opciones del decorador — si no, Nest lanza
  `CannotDetermineTypeError` en tiempo de ejecución (no en compilación). Ver
  `person.schema.ts` (`rol`, `suscripcion`) para el patrón.
- **Schemas compartidos entre módulos**: varios módulos registran el mismo modelo
  Mongoose (`Equipo`, `Cinturon`, `BeltDate`, `Person`) vía su propio
  `MongooseModule.forFeature(...)` en lugar de importarse unos a otros — es un patrón
  soportado y evita dependencias circulares entre módulos (ver comentarios en
  `person.module.ts`, `belt-date.module.ts`, `solicitud-equipo.module.ts`).
- **2 inconsistencias del Express original, replicadas a propósito** (la migración es
  de comportamiento idéntico, no se "arreglan" bugs de negocio salvo los 3 de
  seguridad ya conocidos):
  - `BeltDateService`: la validación de "fecha no futura" en `create()` ignora la
    hora (compara solo fecha) pero en `update()` NO — mismo comportamiento que tenía
    el Express original, documentado con comentario en el código.
  - `ClaseService.update()`: si cambias el `tipo` de una clase sin enviar
    explícitamente `null`/vacío en el campo del tipo anterior (p. ej. pasar de
    `recurrente` a `especial` sin enviar `diaSemana: null`), el campo viejo queda
    huérfano en el documento. Ya pasaba en Express (mismo código de validación,
    mismo `findByIdAndUpdate` parcial). Se detectó durante las pruebas del hito 5 y
    se decidió no corregirlo para no desviarse del alcance de la migración.
- **Prettier**: el scaffold de `@nestjs/cli` genera `.prettierrc` con comillas
  simples por defecto — se cambió a `"singleQuote": false` y se reformateó todo el
  código antes del punto de corte (Daniel usa comillas dobles en todo el proyecto).
- **Node/CLI**: `@nestjs/cli@latest` en este momento resuelve una versión demasiado
  nueva (requiere Node ≥22.22/24.15/26) incompatible con Node 22.14 instalado aquí.
  Se fijó `@nestjs/cli@11` explícitamente al hacer scaffold. Si se repite el
  scaffold de algo en el futuro, tenerlo en cuenta.

## Comandos útiles para retomar en otro ordenador

```bash
git checkout ticket-17
git pull origin ticket-17   # o el remoto que corresponda
npm install
cp .env.example .env        # rellenar con los valores reales (MONGO_URI, JWT_SECRET, etc.)
npx tsc --noEmit             # comprobar que compila
npm run start:dev            # arrancar en modo desarrollo
```

Ver el README.md para el resto de detalles (estructura, variables de entorno, scripts,
permisos por módulo).
