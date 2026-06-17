// ========== IMPORTACIONES ==========

// Importamos el modelo SolicitudEquipo para interactuar con la base de datos
const SolicitudEquipo = require("../models/solicitudEquipo.model");

// TIPOS_SOLICITUD viene exportado como propiedad del propio modelo (ver solicitudEquipo.model.js)
const { TIPOS_SOLICITUD } = SolicitudEquipo;

// Importamos el modelo Equipo para verificar que el usuario es maestro responsable
const Equipo = require("../models/equipo.model");

// Importamos mongoose para validar ObjectIds
const mongoose = require("mongoose");

// ========== CONTROLADOR: CREAR SOLICITUD ==========
/**
 * POST /api/solicitudes-equipo
 *
 * El atleta autenticado solicita unirse a un equipo (como miembro o como afiliado).
 * El campo 'atleta' nunca se toma del body: siempre es el usuario autenticado,
 * para evitar que alguien cree solicitudes en nombre de otra persona.
 *
 * Body esperado:
 * {
 *   "equipo": "64f3a1b2..." (ObjectId del equipo, obligatorio),
 *   "tipo": "equipo" | "afiliacion" (obligatorio),
 *   "mensaje": "Hola, me gustaría..." (opcional)
 * }
 *
 * Las validaciones de duplicados y de equipo sin maestros responsables
 * las hace el middleware pre-save del modelo (ver solicitudEquipo.model.js).
 *
 * Respuesta exitosa: 201 con la solicitud creada
 * Respuesta con validación fallida: 400 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const create = async (req, res) => {
  try {
    const { equipo, tipo, mensaje } = req.body;

    // Validación: equipo debe ser un ObjectId válido
    if (!equipo || !mongoose.Types.ObjectId.isValid(equipo)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    // Validación: tipo debe ser uno de los valores permitidos
    if (!tipo || !TIPOS_SOLICITUD.includes(tipo)) {
      return res.status(400).json({
        mensaje: `Tipo de solicitud inválido. Valores permitidos: ${TIPOS_SOLICITUD.join(", ")}`,
      });
    }

    // Creamos la solicitud con el atleta autenticado (nunca desde el body)
    const nuevaSolicitud = new SolicitudEquipo({
      atleta: req.user._id,
      equipo,
      tipo,
      mensaje,
    });

    // Guardamos: aquí se ejecutan las validaciones del pre-save del modelo
    // (duplicados, equipo sin maestros responsables, etc.)
    await nuevaSolicitud.save();

    // Poblamos el equipo antes de responder, para que el atleta vea el nombre directamente
    await nuevaSolicitud.populate("equipo", "nombre fotoLogo");

    res.status(201).json(nuevaSolicitud);
  } catch (error) {
    console.error("Error al crear solicitud de equipo:", error);

    // Errores lanzados por el pre-save del modelo (duplicados, equipo inválido, etc.)
    // llegan aquí como Error genérico, no como ValidationError
    if (
      error.message.includes("pendiente para este equipo") ||
      error.message.includes("no existe") ||
      error.message.includes("no acepta solicitudes")
    ) {
      return res.status(400).json({ mensaje: error.message });
    }

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al crear la solicitud" });
  }
};

// ========== CONTROLADOR: LISTAR MIS SOLICITUDES ==========
/**
 * GET /api/solicitudes-equipo/mias
 *
 * El atleta autenticado consulta todas sus propias solicitudes (cualquier estado).
 * Útil para que vea el historial: pendientes, aceptadas y rechazadas.
 *
 * Respuesta exitosa: 200 con array de solicitudes
 * Respuesta con error: 500 con mensaje genérico
 */
const getMisSolicitudes = async (req, res) => {
  try {
    const solicitudes = await SolicitudEquipo.find({ atleta: req.user._id })
      .populate("equipo", "nombre fotoLogo")
      .sort({ fechaSolicitud: -1 });

    res.status(200).json(solicitudes);
  } catch (error) {
    console.error("Error al obtener mis solicitudes:", error);
    res.status(500).json({ mensaje: "Error al obtener las solicitudes" });
  }
};

// ========== CONTROLADOR: LISTAR SOLICITUDES PENDIENTES DE UN EQUIPO ==========
/**
 * GET /api/solicitudes-equipo/equipo/:equipoId
 *
 * Permite a un Maestro responsable del equipo (o a un Admin) ver las solicitudes
 * pendientes de ese equipo, para poder aceptarlas o rechazarlas.
 *
 * Usa el método estático solicitudesPendientes() definido en el modelo.
 *
 * Respuesta exitosa: 200 con array de solicitudes pendientes
 * Respuesta sin permisos: 403 con mensaje
 * Respuesta equipo no encontrado: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const getPendientesPorEquipo = async (req, res) => {
  try {
    const { equipoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(equipoId)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    const equipo = await Equipo.findById(equipoId);
    if (!equipo) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    // Admin tiene acceso siempre; Maestro solo si es responsable de este equipo concreto
    if (req.user.rol !== "Admin") {
      const esMaestroResponsable = equipo.maestrosResponsables.some(
        (maestroId) => maestroId.toString() === req.user._id.toString(),
      );

      if (!esMaestroResponsable) {
        return res.status(403).json({
          mensaje: "No eres maestro responsable de este equipo",
        });
      }
    }

    const solicitudes = await SolicitudEquipo.solicitudesPendientes(equipoId);

    res.status(200).json(solicitudes);
  } catch (error) {
    console.error("Error al obtener solicitudes pendientes:", error);
    res.status(500).json({ mensaje: "Error al obtener las solicitudes pendientes" });
  }
};

// ========== CONTROLADOR: ACEPTAR SOLICITUD ==========
/**
 * PUT /api/solicitudes-equipo/:id/aceptar
 *
 * Permite a un Maestro responsable del equipo de la solicitud (o a un Admin) aceptarla.
 * Al aceptar, el método aceptar() del modelo asigna el equipo (o lo añade a afiliacion)
 * en el documento Person del atleta.
 *
 * Body opcional: { "respuestaMaestro": "¡Bienvenido al equipo!" }
 *
 * Respuesta exitosa: 200 con la solicitud actualizada
 * Respuesta sin permisos: 403 con mensaje
 * Respuesta no encontrada: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const aceptar = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestaMaestro } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de solicitud inválido" });
    }

    const solicitud = await SolicitudEquipo.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    // Solo se pueden aceptar solicitudes pendientes
    if (solicitud.estado !== "pendiente") {
      return res.status(400).json({
        mensaje: `Esta solicitud ya fue ${solicitud.estado}`,
      });
    }

    // Verificamos que el usuario es Admin o maestro responsable del equipo de la solicitud
    if (req.user.rol !== "Admin") {
      const equipo = await Equipo.findOne({
        _id: solicitud.equipo,
        maestrosResponsables: req.user._id,
      });

      if (!equipo) {
        return res.status(403).json({
          mensaje: "No eres maestro responsable de este equipo",
        });
      }
    }

    // El método aceptar() guarda la solicitud y actualiza al atleta (equipo o afiliacion)
    await solicitud.aceptar(respuestaMaestro);

    await solicitud.populate("equipo", "nombre fotoLogo");
    await solicitud.populate("atleta", "nombre apellidos email");

    res.status(200).json(solicitud);
  } catch (error) {
    console.error("Error al aceptar solicitud:", error);
    res.status(500).json({ mensaje: "Error al aceptar la solicitud" });
  }
};

// ========== CONTROLADOR: RECHAZAR SOLICITUD ==========
/**
 * PUT /api/solicitudes-equipo/:id/rechazar
 *
 * Permite a un Maestro responsable del equipo de la solicitud (o a un Admin) rechazarla.
 * El atleta no se ve afectado: sigue sin equipo (o con el que ya tuviera).
 *
 * Body opcional: { "respuestaMaestro": "Lo siento, estamos completos" }
 *
 * Respuesta exitosa: 200 con la solicitud actualizada
 * Respuesta sin permisos: 403 con mensaje
 * Respuesta no encontrada: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const rechazar = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestaMaestro } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de solicitud inválido" });
    }

    const solicitud = await SolicitudEquipo.findById(id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: "Solicitud no encontrada" });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(400).json({
        mensaje: `Esta solicitud ya fue ${solicitud.estado}`,
      });
    }

    if (req.user.rol !== "Admin") {
      const equipo = await Equipo.findOne({
        _id: solicitud.equipo,
        maestrosResponsables: req.user._id,
      });

      if (!equipo) {
        return res.status(403).json({
          mensaje: "No eres maestro responsable de este equipo",
        });
      }
    }

    await solicitud.rechazar(respuestaMaestro);

    await solicitud.populate("equipo", "nombre fotoLogo");
    await solicitud.populate("atleta", "nombre apellidos email");

    res.status(200).json(solicitud);
  } catch (error) {
    console.error("Error al rechazar solicitud:", error);
    res.status(500).json({ mensaje: "Error al rechazar la solicitud" });
  }
};

// ========== EXPORTACIONES ==========

module.exports = {
  create,
  getMisSolicitudes,
  getPendientesPorEquipo,
  aceptar,
  rechazar,
};
