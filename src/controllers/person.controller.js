// Importamos el modelo Person para operar sobre la colección de personas
const Person = require("../models/person.model");

// Importamos el modelo Equipo para verificar pertenencia a equipos y maestrosResponsables
const Equipo = require("../models/equipo.model");

// Importamos mongoose para validar ObjectIds
const mongoose = require("mongoose");

// ========== CAMPOS PERMITIDOS POR ROL ==========

// Campos que un usuario puede actualizar de sí mismo (vía PUT /api/personas/me)
// email es inmutable, password tiene su propia ruta, el resto lo gestiona el Maestro o Admin
const CAMPOS_ATLETA_SELF = [
  "nombre",
  "apellidos",
  "telefono",
  "foto",
  "edad",
  "peso",
  "numeroFederacion",
  "afiliacion",
];

// Campos que un Maestro puede actualizar en los atletas de su equipo (vía PUT /api/personas/:id)
// cinturon y beltDates se gestionan a través del BeltDate controller — al crear un BeltDate,
// ese controller actualiza Person.cinturon y resetea Person.clasesAsistidas a 0 automáticamente
// clasesAsistidas: automático (pase de lista y cambio de cinturón via BeltDate controller)
// clasesImpartidas: automático (pase de lista), se resetea vía endpoint dedicado — ver resetClasesImpartidas
// equipo: se gestiona aparte dentro de updateById (solo puede ponerse a null)
const CAMPOS_MAESTRO_ATLETA = ["suscripcion"];

// Campos que NUNCA pueden modificarse a través de los endpoints de actualización general
// email: inmutable por diseño de negocio
// password: tiene su propia ruta dedicada (PUT /me/password)
// rol: solo se cambia por Admin vía PUT /:id/rol
// clasesAsistidas / clasesImpartidas: contadores automáticos gestionados por el sistema
const CAMPOS_BLOQUEADOS = [
  "email",
  "password",
  "rol",
  "clasesAsistidas",
  "clasesImpartidas",
  "_id",
  "createdAt",
  "updatedAt",
];

// ========== LISTAR TODAS LAS PERSONAS ==========

/**
 * GET /api/personas
 * Solo Admin puede listar todas las personas.
 *
 * Populamos equipo y cinturon con los campos mínimos para no sobrecargar la respuesta.
 * El detalle completo se obtiene con getById.
 */
const getAll = async (req, res) => {
  try {
    const personas = await Person.find()
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .sort({ createdAt: -1 });

    res.status(200).json(personas);
  } catch (error) {
    console.error("Error al obtener personas:", error);
    res.status(500).json({ mensaje: "Error al obtener las personas" });
  }
};

// ========== OBTENER MI PROPIO PERFIL ==========

/**
 * GET /api/personas/me
 * Cualquier usuario autenticado puede ver su propio perfil completo.
 *
 * req.user viene de verificarToken sin populate, así que hacemos una nueva
 * consulta para devolver los datos poblados (equipo, cinturón, etc.).
 */
const getMe = async (req, res) => {
  try {
    const persona = await Person.findById(req.user._id)
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .populate("beltDates")
      .populate("afiliacion", "nombre fotoLogo");

    if (!persona) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.status(200).json(persona);
  } catch (error) {
    console.error("Error al obtener perfil propio:", error);
    res.status(500).json({ mensaje: "Error al obtener el perfil" });
  }
};

// ========== OBTENER PERFIL POR ID ==========

/**
 * GET /api/personas/:id
 *
 * Reglas de visibilidad (hasta T24 donde se implementa perfilPublico):
 * - Admin: puede ver a cualquier persona
 * - Maestro: puede verse a sí mismo, ver a sus atletas y ver a los co-maestros de su equipo
 * - Atleta: puede verse a sí mismo y ver a sus compañeros de equipo
 *
 * Nota: Maestros del mismo equipo pueden verse entre sí pero NO modificarse.
 */
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de persona inválido" });
    }

    const persona = await Person.findById(id)
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado")
      .populate("beltDates")
      .populate("afiliacion", "nombre fotoLogo");

    if (!persona) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    const { rol, _id: usuarioId, equipo: equipoUsuario } = req.user;

    // Admin: acceso total sin restricciones
    if (rol === "Admin") {
      return res.status(200).json(persona);
    }

    // Cualquier rol puede verse a sí mismo
    if (usuarioId.toString() === id) {
      return res.status(200).json(persona);
    }

    if (rol === "Maestro") {
      // El Maestro puede ver a los atletas y co-maestros de su equipo
      // Buscamos un equipo donde este Maestro sea responsable y la persona también esté vinculada
      // Cubre dos casos: persona.equipo (atletas) y persona en maestrosResponsables (co-maestros)
      const equipoCompartido = await Equipo.findOne({
        maestrosResponsables: usuarioId,
        $or: [
          { _id: persona.equipo },           // la persona es atleta de este equipo
          { maestrosResponsables: persona._id }, // la persona es co-maestro de este equipo
        ],
      });

      if (!equipoCompartido) {
        return res.status(403).json({ mensaje: "No tienes permisos para ver este perfil" });
      }

      return res.status(200).json(persona);
    }

    if (rol === "Atleta") {
      // El Atleta puede ver a sus compañeros de equipo (mismo equipo asignado)
      const mismoEquipo =
        equipoUsuario &&
        persona.equipo &&
        equipoUsuario.toString() === persona.equipo._id.toString();

      if (!mismoEquipo) {
        return res.status(403).json({ mensaje: "No tienes permisos para ver este perfil" });
      }

      return res.status(200).json(persona);
    }

    res.status(403).json({ mensaje: "No tienes permisos para ver este perfil" });
  } catch (error) {
    console.error("Error al obtener persona por ID:", error);
    res.status(500).json({ mensaje: "Error al obtener la persona" });
  }
};

// ========== ACTUALIZAR MI PROPIO PERFIL ==========

/**
 * PUT /api/personas/me
 * Cualquier usuario autenticado puede actualizar sus propios campos permitidos.
 * Solo se aceptan los campos definidos en CAMPOS_ATLETA_SELF; el resto se ignora.
 */
const updateMe = async (req, res) => {
  try {
    // Filtramos el body para incluir solo los campos que el usuario puede cambiar
    const camposPermitidos = {};
    CAMPOS_ATLETA_SELF.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        camposPermitidos[campo] = req.body[campo];
      }
    });

    if (Object.keys(camposPermitidos).length === 0) {
      return res
        .status(400)
        .json({ mensaje: "No se proporcionaron campos válidos para actualizar" });
    }

    const personaActualizada = await Person.findByIdAndUpdate(
      req.user._id,
      camposPermitidos,
      { new: true, runValidators: true },
    )
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado");

    res.status(200).json(personaActualizada);
  } catch (error) {
    console.error("Error al actualizar perfil propio:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al actualizar el perfil" });
  }
};

// ========== CAMBIAR MI PASSWORD ==========

/**
 * PUT /api/personas/me/password
 * Cualquier usuario autenticado puede cambiar su propio password.
 *
 * Body esperado: { passwordActual, passwordNuevo }
 *
 * Proceso:
 * 1. Verificamos que passwordActual coincide con el hash almacenado
 * 2. Asignamos passwordNuevo — el middleware pre-save del modelo lo hasheará automáticamente
 */
const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
      return res
        .status(400)
        .json({ mensaje: "Debes proporcionar el password actual y el nuevo" });
    }

    // Necesitamos el campo password para comparar (tiene select:false en el esquema)
    const persona = await Person.findById(req.user._id).select("+password");

    if (!persona) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const esValido = await persona.compararPassword(passwordActual);
    if (!esValido) {
      return res.status(401).json({ mensaje: "El password actual es incorrecto" });
    }

    // Asignamos el nuevo password — el pre-save lo hasheará automáticamente
    persona.password = passwordNuevo;
    await persona.save();

    res.status(200).json({ mensaje: "Password actualizado correctamente" });
  } catch (error) {
    console.error("Error al cambiar password:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al cambiar el password" });
  }
};

// ========== ACTUALIZAR PERSONA POR ID (Admin / Maestro) ==========

/**
 * PUT /api/personas/:id
 *
 * Admin: puede actualizar cualquier campo excepto los de CAMPOS_BLOQUEADOS
 * Maestro: solo puede actualizar atletas de su equipo, y solo CAMPOS_MAESTRO_ATLETA
 *   - Si actualiza cinturon → clasesAsistidas se resetea a 0 automáticamente
 *   - Si envía equipo:null → se le quita el equipo al atleta (lo echa del equipo)
 *   - Si envía equipo con cualquier otro valor → error (debe ir por SolicitudEquipo)
 * Atleta: no tiene acceso, debe usar PUT /me
 */
const updateById = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol: rolUsuario } = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de persona inválido" });
    }

    // Atletas no pueden usar esta ruta
    if (rolUsuario === "Atleta") {
      return res.status(403).json({
        mensaje: "No tienes permisos para esta acción. Usa PUT /api/personas/me para editar tu propio perfil",
      });
    }

    const persona = await Person.findById(id);
    if (!persona) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    let camposPermitidos = {};

    if (rolUsuario === "Admin") {
      // Admin puede actualizar todo excepto los campos bloqueados
      camposPermitidos = { ...req.body };
      CAMPOS_BLOQUEADOS.forEach((campo) => delete camposPermitidos[campo]);
    } else if (rolUsuario === "Maestro") {
      // Verificamos que el atleta pertenece a un equipo del que este Maestro es responsable
      const equipoDelAtleta = await Equipo.findOne({
        _id: persona.equipo,
        maestrosResponsables: req.user._id,
      });

      if (!equipoDelAtleta) {
        return res.status(403).json({ mensaje: "Solo puedes modificar atletas de tu equipo" });
      }

      // Filtramos para incluir solo los campos que el Maestro puede cambiar
      CAMPOS_MAESTRO_ATLETA.forEach((campo) => {
        if (req.body[campo] !== undefined) {
          camposPermitidos[campo] = req.body[campo];
        }
      });

      // equipo: solo se permite poner a null (echar del equipo)
      // Para asignar equipo el atleta debe enviar una SolicitudEquipo
      if (req.body.equipo !== undefined) {
        if (req.body.equipo !== null) {
          return res.status(400).json({
            mensaje:
              "Para asignar un equipo a un atleta este debe enviar una solicitud. Solo puedes quitarle el equipo (equipo: null)",
          });
        }
        camposPermitidos.equipo = null;
      }

      if (Object.keys(camposPermitidos).length === 0) {
        return res
          .status(400)
          .json({ mensaje: "No se proporcionaron campos válidos para actualizar" });
      }
    }

    const personaActualizada = await Person.findByIdAndUpdate(id, camposPermitidos, {
      new: true,
      runValidators: true,
    })
      .populate("equipo", "nombre fotoLogo")
      .populate("cinturon", "color grado");

    res.status(200).json(personaActualizada);
  } catch (error) {
    console.error("Error al actualizar persona:", error);

    if (error.name === "ValidationError") {
      const mensajes = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ mensaje: mensajes[0] });
    }

    res.status(500).json({ mensaje: "Error al actualizar la persona" });
  }
};

// ========== CAMBIAR ROL ==========

/**
 * PUT /api/personas/:id/rol
 * Solo Admin puede cambiar el rol de una persona.
 *
 * Body esperado: { rol: "Admin" | "Maestro" | "Atleta" }
 */
const cambiarRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de persona inválido" });
    }

    const ROLES_VALIDOS = ["Admin", "Maestro", "Atleta"];
    if (!rol || !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({
        mensaje: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(", ")}`,
      });
    }

    const personaActualizada = await Person.findByIdAndUpdate(
      id,
      { rol },
      { new: true, runValidators: true },
    );

    if (!personaActualizada) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.status(200).json(personaActualizada);
  } catch (error) {
    console.error("Error al cambiar rol:", error);
    res.status(500).json({ mensaje: "Error al cambiar el rol" });
  }
};

// ========== ELIMINAR PERSONA ==========

/**
 * DELETE /api/personas/:id
 * Solo Admin puede eliminar personas.
 * Un Admin no puede eliminarse a sí mismo para evitar quedar sin administrador.
 *
 * Nota: No se eliminan en cascada las referencias a esta persona en otros documentos.
 * Esa limpieza se abordará en un ticket futuro junto con el derecho al olvido (GDPR - T24).
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ mensaje: "ID de persona inválido" });
    }

    // Prevenimos que el Admin se elimine a sí mismo
    if (req.user._id.toString() === id) {
      return res.status(400).json({ mensaje: "No puedes eliminar tu propia cuenta" });
    }

    const personaEliminada = await Person.findByIdAndDelete(id);

    if (!personaEliminada) {
      return res.status(404).json({ mensaje: "Persona no encontrada" });
    }

    res.status(200).json({ mensaje: "Persona eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar persona:", error);
    res.status(500).json({ mensaje: "Error al eliminar la persona" });
  }
};

// ========== RESETEAR CLASES IMPARTIDAS DEL EQUIPO ==========

/**
 * PUT /api/equipos/:id/reset-clases-impartidas
 * Cualquier Maestro del equipo puede poner a 0 el contador clasesImpartidas
 * de TODOS los maestros responsables de ese equipo.
 *
 * Caso de uso: al final de un período, los maestros acuerdan reiniciar
 * el contador para volver a llevar el balance de clases impartidas desde cero.
 *
 * Solo los Maestros del equipo pueden ejecutar esta acción.
 * Los Admins tienen acceso siempre.
 */
const resetClasesImpartidas = async (req, res) => {
  try {
    const { id: equipoId } = req.params;
    const { rol, _id: usuarioId } = req.user;

    if (!mongoose.Types.ObjectId.isValid(equipoId)) {
      return res.status(400).json({ mensaje: "ID de equipo inválido" });
    }

    const equipo = await Equipo.findById(equipoId);
    if (!equipo) {
      return res.status(404).json({ mensaje: "Equipo no encontrado" });
    }

    // Verificamos que el usuario tiene acceso: Admin siempre, Maestro solo si es responsable del equipo
    if (rol !== "Admin") {
      const esMaestroResponsable = equipo.maestrosResponsables.some(
        (maestroId) => maestroId.toString() === usuarioId.toString(),
      );

      if (!esMaestroResponsable) {
        return res.status(403).json({
          mensaje: "Solo los maestros responsables de este equipo pueden resetear las clases impartidas",
        });
      }
    }

    // Ponemos clasesImpartidas a 0 en todos los maestros responsables del equipo
    // updateMany actualiza múltiples documentos en una sola operación de base de datos
    const resultado = await Person.updateMany(
      { _id: { $in: equipo.maestrosResponsables } },
      { clasesImpartidas: 0 },
    );

    res.status(200).json({
      mensaje: "Clases impartidas reseteadas correctamente",
      maestrosActualizados: resultado.modifiedCount,
    });
  } catch (error) {
    console.error("Error al resetear clases impartidas:", error);
    res.status(500).json({ mensaje: "Error al resetear las clases impartidas" });
  }
};

// ========== EXPORTACIONES ==========

module.exports = {
  getAll,
  getMe,
  getById,
  updateMe,
  cambiarPassword,
  updateById,
  cambiarRol,
  remove,
  resetClasesImpartidas,
};
