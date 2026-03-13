// Importamos Mongoose para trabajar con MongoDB
const mongoose = require("mongoose");

// ========== ENUM: Estados posibles de una solicitud ==========
const ESTADOS = ["pendiente", "aceptada", "rechazada"];

// ========== ENUM: Tipos de solicitud ==========
const TIPOS_SOLICITUD = ["equipo", "afiliacion"];

// ========== DEFINICIÓN DEL ESQUEMA ==========

const SolicitudEquipoSchema = new mongoose.Schema(
  {
    // ===== CAMPOS OBLIGATORIOS =====

    // Atleta que solicita unirse al equipo
    // Referencia al modelo Person (debe tener rol 'Atleta')
    atleta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person", // Referencia al modelo Person
      required: true, // Campo obligatorio
      index: true, // Índice para búsquedas rápidas
    },

    // Equipo al que el atleta solicita unirse
    // Referencia al modelo Equipo
    equipo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipo", // Referencia al modelo Equipo
      required: true, // Campo obligatorio
      index: true, // Índice para búsquedas rápidas
    },

    // Tipo de solicitud: si el atleta quiere unirse como miembro del equipo
    // o como afiliado (puede estar afiliado a varios equipos)
    // "equipo"    → actualiza Person.equipo (campo único, solo un equipo)
    // "afiliacion" → añade a Person.afiliacion[] (puede haber varios)
    tipo: {
      type: String,
      enum: TIPOS_SOLICITUD, // Solo puede ser 'equipo' o 'afiliacion'
      required: true, // Campo obligatorio
    },

    // Estado actual de la solicitud
    // Valores posibles: 'pendiente', 'aceptada', 'rechazada'
    estado: {
      type: String,
      enum: ESTADOS, // Solo puede ser uno de estos valores
      default: "pendiente", // Por defecto, toda solicitud inicia como pendiente
      required: true, // Campo obligatorio
    },

    // Fecha en que el atleta envió la solicitud
    // Se establece automáticamente al crear la solicitud
    fechaSolicitud: {
      type: Date,
      required: true, // Campo obligatorio
      default: Date.now, // Por defecto, fecha y hora actual
    },

    // ===== CAMPOS OPCIONALES =====

    // Fecha en que el maestro respondió (aceptó o rechazó)
    // null = aún no ha sido respondida (estado: pendiente)
    // Date = ya fue respondida (estado: aceptada o rechazada)
    fechaRespuesta: {
      type: Date,
      default: null, // Por defecto null hasta que se responda
    },

    // Mensaje opcional del atleta al solicitar
    // Ejemplo: "Hola, me gustaría entrenar Jiu-Jitsu en vuestro dojo"
    mensaje: {
      type: String,
      maxlength: 500, // Máximo 500 caracteres
      trim: true, // Elimina espacios al inicio y final
    },

    // Mensaje opcional del maestro al responder
    // Ejemplo: "¡Bienvenido al equipo!" o "Lo siento, estamos completos"
    respuestaMaestro: {
      type: String,
      maxlength: 500, // Máximo 500 caracteres
      trim: true, // Elimina espacios al inicio y final
    },
  },
  {
    // timestamps: true crea automáticamente dos campos:
    // - createdAt: fecha de creación del documento
    // - updatedAt: fecha de última modificación
    timestamps: true,
  },
);

// ========== ÍNDICES COMPUESTOS ==========
// Los índices mejoran el rendimiento en búsquedas frecuentes

// Índice 1: Para evitar solicitudes duplicadas (mismo atleta + mismo equipo + mismo tipo + pendiente)
// Con 'tipo' incluido, un atleta puede tener una solicitud de "equipo" y otra de "afiliacion"
// al mismo equipo simultáneamente sin conflicto
SolicitudEquipoSchema.index({ atleta: 1, equipo: 1, tipo: 1, estado: 1 });

// Índice 2: Para buscar rápidamente solicitudes pendientes de un equipo específico
// Usado por maestros para ver solicitudes de su equipo
SolicitudEquipoSchema.index({ equipo: 1, estado: 1 });

// Índice 3: Para buscar rápidamente las solicitudes de un atleta
// Usado por atletas para ver sus propias solicitudes (mis solicitudes)
SolicitudEquipoSchema.index({ atleta: 1, estado: 1 });

// ========== MIDDLEWARE PRE-SAVE: VALIDACIONES ==========

/**
 * Middleware que se ejecuta ANTES de guardar una solicitud en la DB
 *
 * Validaciones:
 * 1. Evitar solicitudes duplicadas (mismo atleta, mismo equipo, estado pendiente)
 * 2. Verificar que el equipo tenga maestros responsables (equipos activos)
 *    - Equipos sin maestros = equipos de referencia (solo publicidad)
 *    - No se puede solicitar unirse a equipos de referencia
 */
SolicitudEquipoSchema.pre("save", async function (next) {
  // Solo aplicar validaciones si es un documento nuevo (no en actualizaciones)
  if (!this.isNew) {
    return next();
  }

  try {
    // ===== VALIDACIÓN 1: Evitar solicitudes duplicadas =====

    // Si el estado es 'pendiente', verificar que no exista otra pendiente
    if (this.estado === "pendiente") {
      // Buscamos si ya existe una solicitud pendiente del mismo atleta,
      // mismo equipo y mismo tipo (equipo o afiliacion)
      const solicitudExistente = await this.constructor.findOne({
        atleta: this.atleta,
        equipo: this.equipo,
        tipo: this.tipo,
        estado: "pendiente",
      });

      // Si existe, lanzamos error (no permitimos duplicados)
      if (solicitudExistente) {
        throw new Error(
          `Ya tienes una solicitud de ${this.tipo} pendiente para este equipo`,
        );
      }
    }

    // ===== VALIDACIÓN 2: Equipo debe tener maestros responsables =====

    // Importamos el modelo Equipo para verificarlo
    const Equipo = require("./equipo.model");

    // Buscamos el equipo en la base de datos
    const equipo = await Equipo.findById(this.equipo);

    // Si el equipo no existe, lanzamos error
    if (!equipo) {
      throw new Error("El equipo no existe");
    }

    // Si el equipo no tiene maestros responsables (array vacío o undefined)
    // significa que es un equipo de referencia (solo publicidad)
    if (
      !equipo.maestrosResponsables ||
      equipo.maestrosResponsables.length === 0
    ) {
      throw new Error(
        "Este equipo no acepta solicitudes (equipo de referencia/publicidad)",
      );
    }

    // Si llegamos aquí, todas las validaciones pasaron
    next();
  } catch (error) {
    // Si hubo algún error en las validaciones, lo pasamos al siguiente middleware
    next(error);
  }
});

// ========== MÉTODOS ESTÁTICOS ==========
// Métodos que se llaman sobre el modelo (no sobre instancias)

/**
 * Obtiene todas las solicitudes pendientes de un equipo específico
 *
 * @param {ObjectId} equipoId - ID del equipo
 * @returns {Array} Array de solicitudes pendientes con datos del atleta poblados
 *
 * Uso:
 * const solicitudes = await SolicitudEquipo.solicitudesPendientes(idEquipoPepe);
 */
SolicitudEquipoSchema.statics.solicitudesPendientes = function (equipoId) {
  return (
    this.find({
      equipo: equipoId,
      estado: "pendiente",
    })
      // Populate trae los datos completos del atleta (no solo el ObjectId)
      .populate("atleta", "nombre apellidos email foto")
      // Ordenar por fecha de solicitud descendente (más reciente primero)
      .sort({ fechaSolicitud: -1 })
  );
};

// ========== MÉTODOS DE INSTANCIA ==========
// Métodos que se llaman sobre documentos individuales (instancias)

/**
 * Acepta una solicitud y asigna el equipo al atleta
 *
 * Proceso:
 * 1. Cambia el estado a 'aceptada'
 * 2. Registra la fecha de respuesta
 * 3. Guarda el mensaje del maestro (si lo hay)
 * 4. Actualiza el campo 'equipo' del atleta en la DB
 *
 * @param {String} mensaje - Mensaje opcional del maestro al aceptar
 * @returns {SolicitudEquipo} La solicitud actualizada
 *
 * Uso:
 * const solicitud = await SolicitudEquipo.findById(idSolicitud);
 * await solicitud.aceptar("¡Bienvenido al equipo!");
 */
SolicitudEquipoSchema.methods.aceptar = async function (mensaje) {
  // Importamos el modelo Person para actualizar el atleta
  const Person = require("./person.model");

  // Actualizamos el estado de la solicitud
  this.estado = "aceptada";
  this.fechaRespuesta = new Date();
  this.respuestaMaestro = mensaje || "Solicitud aceptada";

  // Guardamos los cambios en la solicitud
  await this.save();

  // Actualizamos el atleta según el tipo de solicitud
  if (this.tipo === "equipo") {
    // Tipo "equipo": asigna el equipo principal del atleta (campo único)
    // El atleta solo puede pertenecer a un equipo a la vez
    await Person.findByIdAndUpdate(this.atleta, {
      equipo: this.equipo,
    });
  } else if (this.tipo === "afiliacion") {
    // Tipo "afiliacion": añade el equipo al array de afiliaciones del atleta
    // El atleta puede estar afiliado a varios equipos simultáneamente
    await Person.findByIdAndUpdate(this.atleta, {
      $addToSet: { afiliacion: this.equipo }, // $addToSet evita duplicados
    });
  }

  // Devolvemos la solicitud actualizada
  return this;
};

/**
 * Rechaza una solicitud
 *
 * Proceso:
 * 1. Cambia el estado a 'rechazada'
 * 2. Registra la fecha de respuesta
 * 3. Guarda el mensaje del maestro (si lo hay)
 * 4. NO modifica el campo 'equipo' del atleta (sigue sin equipo o con su equipo actual)
 *
 * @param {String} mensaje - Mensaje opcional del maestro al rechazar
 * @returns {SolicitudEquipo} La solicitud actualizada
 *
 * Uso:
 * const solicitud = await SolicitudEquipo.findById(idSolicitud);
 * await solicitud.rechazar("Lo siento, estamos completos");
 */
SolicitudEquipoSchema.methods.rechazar = async function (mensaje) {
  // Actualizamos el estado de la solicitud
  this.estado = "rechazada";
  this.fechaRespuesta = new Date();
  this.respuestaMaestro = mensaje || "Solicitud rechazada";

  // Guardamos los cambios en la solicitud
  await this.save();

  // NO modificamos el campo 'equipo' del atleta
  // El atleta sigue sin equipo (o con su equipo actual si tenía uno)

  // Devolvemos la solicitud actualizada
  return this;
};

// ========== CREACIÓN DEL MODELO ==========

// Creamos el modelo 'SolicitudEquipo' a partir del esquema
// Mongoose creará automáticamente la colección 'solicitudequipos' en MongoDB
const SolicitudEquipo = mongoose.model(
  "SolicitudEquipo",
  SolicitudEquipoSchema,
);

// ========== EXPORTACIONES ==========

// Exportamos el modelo para usarlo en otros archivos (controladores, rutas)
module.exports = SolicitudEquipo;

// También exportamos los enums para reutilizarlos (ej: en validaciones del controlador)
module.exports.ESTADOS = ESTADOS;
module.exports.TIPOS_SOLICITUD = TIPOS_SOLICITUD;
