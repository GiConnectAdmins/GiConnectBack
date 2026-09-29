# Migración de Express a NestJS

El backend de GiConnect se construyó originalmente con Express y JavaScript. En septiembre de 2026 se migró por completo a **NestJS 11 y TypeScript** (Ticket 17, PR #18, mergeado en `develop` el 2026-09-11).

Fue una migración de **comportamiento idéntico**: mismas rutas, mismos códigos de estado y mismos mensajes de error. No se cambió ninguna regla de negocio, salvo cuatro problemas de seguridad que ya estaban identificados y que se corrigieron por el camino:

- **Ticket 21**: autenticación en las rutas GET que seguían abiertas, cabeceras de seguridad con Helmet y límite de intentos en el login.
- **Registro como Admin**: el registro público permitía elegir `rol: "Admin"`. Ahora el DTO de registro no admite `rol` y el servicio lo fuerza siempre a `"Atleta"`.
- **Mass assignment en Equipo**: el update pasaba el body completo a la base de datos y permitía inyectar `maestrosResponsables`. Ahora los DTOs usan whitelist.
- **CORS abierto**: ahora se restringe al origen definido en `FRONTEND_URL`.

## Cómo se hizo

Se aplicó el patrón *strangler fig*: la app NestJS convivió con la de Express en un puerto distinto durante toda la migración, y se fue migrando módulo a módulo en una sola rama (`ticket-17`), con un commit por hito y un único PR final. Cada hito se verificó levantando el servidor y probando cada caso con `curl` contra la base de datos real, limpiando después los datos de prueba.

| Hito | Contenido |
|---|---|
| 1 | Scaffold de NestJS, configuración validada con Joi, conexión a MongoDB Atlas, filtro global de excepciones (`{ mensaje }` para todo), `ValidationPipe` global, Helmet y CORS configurable |
| 2 | Módulo Auth (registro y login) y schema base de Person, con el rol forzado a `"Atleta"` |
| 3 | Módulo Person: las 4 reglas de visibilidad (Admin, uno mismo, Maestro de su equipo, Atleta del mismo equipo), permisos de edición por rol, `JwtAuthGuard`, `RolesGuard` y `ParseObjectIdPipe` |
| 4 | Módulo Equipo: DTOs con whitelist, `MaestroResponsableGuard` y endpoint `reset-clases-impartidas` |
| 5 | Módulo Clase: coherencia entre tipo, fecha y día de la semana, y filtros de búsqueda (`maestro`, `tipo`, `titulo`) |
| 6 | Módulos Cinturon (catálogo, escritura solo Admin) y BeltDate (Admin y Maestro conceden cinturones, solo Admin elimina) |
| 7 | Módulo SolicitudEquipo: la lógica de aceptar, rechazar y evitar duplicados pasó del modelo de Mongoose al servicio, con inyección de dependencias |
| 8 | Endurecimiento de seguridad transversal: autenticación en las rutas que quedaban abiertas y límite de 5 intentos por minuto en el login |
| 9 | Punto de corte: NestJS pasa a la raíz del repo y se elimina el código de Express, verificando que responde igual en el puerto real |
| 10 | README y esta documentación, revisión final y PR |

## Particularidades técnicas

- **Mongoose + TypeScript + union types**: un `@Prop()` sobre un campo tipado como unión de literales (`'Admin' | 'Maestro' | 'Atleta'`, o cualquier unión con `| null`) necesita `type: String` explícito en las opciones del decorador. Si no, Nest lanza `CannotDetermineTypeError` en tiempo de ejecución, no en compilación. Ver `person.schema.ts` para el patrón.
- **Schemas compartidos entre módulos**: varios módulos registran el mismo modelo (`Equipo`, `Cinturon`, `BeltDate`, `Person`) con su propio `MongooseModule.forFeature(...)` en lugar de importarse unos a otros. Es un patrón soportado y evita dependencias circulares (ver `person.module.ts`, `belt-date.module.ts` y `solicitud-equipo.module.ts`).
- **Dos comportamientos del Express original replicados a propósito**, para no cambiar la lógica de negocio dentro de la migración:
  - `BeltDateService`: la validación de "fecha no futura" compara solo el día en `create()`, pero no en `update()`.
  - `ClaseService.update()`: al cambiar el `tipo` de una clase sin vaciar el campo del tipo anterior (por ejemplo, pasar de `recurrente` a `especial` sin enviar `diaSemana: null`), el campo antiguo queda en el documento.
- **Prettier**: el scaffold de `@nestjs/cli` genera `.prettierrc` con comillas simples; se cambió a `"singleQuote": false` y se reformateó todo el código, siguiendo la convención del proyecto.
- **Versión del CLI**: `@nestjs/cli@latest` exigía una versión de Node más nueva que la instalada (22.14), así que se fijó `@nestjs/cli@11` para el scaffold.

Después de la migración se añadieron los tests unitarios con Jest y el análisis con SonarCloud en GitHub Actions: ver [TESTING.md](./TESTING.md).
