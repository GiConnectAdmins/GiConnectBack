// ========== IMPORTACIONES ==========
// Importamos el modelo BeltDate para interactuar con la base de datos
const BeltDate = require("../models/beltdate.model");

// Importamos el modelo Cinturon para validar su existencia y para que Mongoose lo registre
const Cinturon = require("../models/cinturon.model");

// ========== CONTROLADOR: LISTAR TODOS LOS BELTDATES ==========
/**
 * GET /api/beltdates
 *
 * Obtiene todos los registros de concesión de cinturones
 * Ordenados por fecha de creación descendente (más reciente primero)
 * Incluye los datos del cinturón poblados (color y grado)
 *
 * Respuesta exitosa: 200 con array de BeltDates
 * Respuesta con error: 500 con mensaje genérico
 */
const getAll = async (req, res) => {
  try {
    // Buscamos todos los BeltDates en la base de datos
    // .populate('cinturon') trae los datos completos del cinturón (no solo el ObjectId)
    // .sort({ createdAt: -1 }) ordena por fecha de creación descendente
    const beltDates = await BeltDate.find()
      .populate("cinturon", "color grado") // Solo traemos color y grado del cinturón
      .sort({ createdAt: -1 });

    // Respondemos con los beltDates encontrados
    res.status(200).json(beltDates);
  } catch (error) {
    // Si hay un error, lo registramos en consola (para debugging)
    console.error("Error al obtener beltDates:", error);

    // Respondemos con error 500 (error interno del servidor)
    // NO exponemos detalles del error al cliente por seguridad
    res.status(500).json({
      mensaje: "Error al obtener los registros de cinturones",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: OBTENER UN BELTDATE POR ID ==========
/**
 * GET /api/beltdates/:id
 *
 * Obtiene un registro específico de concesión de cinturón por su ID
 * Incluye los datos del cinturón (populate)
 *
 * Respuesta exitosa: 200 con el objeto BeltDate
 * Respuesta no encontrado: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const getById = async (req, res) => {
  try {
    // Extraemos el id de los parámetros de la URL
    const { id } = req.params;

    // Buscamos el BeltDate por ID y poblamos el campo cinturon
    const beltDate = await BeltDate.findById(id).populate(
      "cinturon",
      "color grado",
    );

    // Si no existe el BeltDate, respondemos con 404
    if (!beltDate) {
      return res.status(404).json({
        mensaje: "Registro de cinturón no encontrado",
        id: id,
      });
    }

    // Si existe, lo devolvemos
    res.status(200).json(beltDate);
  } catch (error) {
    console.error("Error al obtener beltDate por ID:", error);

    // Si el error es por ID inválido (formato incorrecto), devolvemos 400
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de registro inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al obtener el registro de cinturón",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: CREAR UN NUEVO BELTDATE ==========
/**
 * POST /api/beltdates
 *
 * Crea un nuevo registro de concesión de cinturón
 *
 * Body esperado (JSON):
 * {
 *   "cinturon": "64f3a1b2..." (ObjectId del cinturón),
 *   "fecha": "2026-02-16T00:00:00.000Z" (fecha de concesión)
 * }
 *
 * Validaciones:
 * - cinturon: obligatorio, debe ser ObjectId válido y existir en la DB
 * - fecha: obligatoria, debe ser fecha válida
 * - Opcional: no permitir fechas futuras (comentado, se puede activar)
 *
 * Respuesta exitosa: 201 con el objeto creado
 * Respuesta con validación fallida: 400 con detalles
 * Respuesta con error: 500 con mensaje genérico
 */
const create = async (req, res) => {
  try {
    // Extraemos los datos del body de la petición
    const { cinturon, fecha } = req.body;

    // ===== VALIDACIONES MANUALES ADICIONALES =====

    // Validación 1: Verificar que el cinturón existe en la base de datos
    const cinturonExiste = await Cinturon.findById(cinturon);

    if (!cinturonExiste) {
      return res.status(400).json({
        mensaje: "El cinturón especificado no existe",
        cinturonId: cinturon,
      });
    }

    // Validación 2: Procesar la fecha
    // Si no se proporciona fecha, usamos la fecha actual
    // Si se proporciona, validamos que no sea futura
    let fechaFinal;

    if (!fecha) {
      // Si no se envió fecha, usar la fecha actual
      fechaFinal = new Date();
    } else {
      // Si se envió fecha, validar que no sea futura
      const fechaProporcionada = new Date(fecha);
      const fechaActual = new Date();

      // Comparamos solo fechas (sin horas) para evitar problemas de zona horaria
      fechaProporcionada.setHours(0, 0, 0, 0);
      fechaActual.setHours(0, 0, 0, 0);

      if (fechaProporcionada > fechaActual) {
        return res.status(400).json({
          mensaje: "No se puede registrar una fecha de concesión futura",
          fechaProporcionada: new Date(fecha).toISOString().split("T")[0],
        });
      }

      fechaFinal = fecha;
    }

    // Creamos el nuevo BeltDate con los datos recibidos
    const nuevoBeltDate = new BeltDate({
      cinturon,
      fecha,
    });

    // Guardamos en la base de datos
    // Las validaciones del modelo (required, tipo Date, etc.) se ejecutan aquí
    await nuevoBeltDate.save();

    // Poblamos el campo cinturon antes de devolver la respuesta
    await nuevoBeltDate.populate("cinturon", "color grado");

    // Respondemos con 201 (creado) y el objeto creado
    res.status(201).json(nuevoBeltDate);
  } catch (error) {
    console.error("Error al crear beltDate:", error);

    // Si el error es de validación de Mongoose, devolvemos 400 con detalles
    if (error.name === "ValidationError") {
      return res.status(400).json({
        mensaje: "Error de validación",
        errores: Object.values(error.errors).map((err) => err.message),
      });
    }

    // Si el error es por ObjectId inválido
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de cinturón inválido",
        cinturonId: req.body.cinturon,
      });
    }

    res.status(500).json({
      mensaje: "Error al crear el registro de cinturón",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: ACTUALIZAR UN BELTDATE ==========
/**
 * PUT /api/beltdates/:id
 *
 * Actualiza un registro de concesión de cinturón existente
 * Permite actualizar el cinturón y/o la fecha
 *
 * Body (JSON): campos a actualizar
 * - Al menos uno de los campos (cinturon o fecha) debe enviarse
 * - Si se actualiza cinturon, se valida que exista en la DB
 *
 * Respuesta exitosa: 200 con el objeto actualizado
 * Respuesta no encontrado: 404 con mensaje
 * Respuesta con validación fallida: 400 con detalles
 * Respuesta con error: 500 con mensaje genérico
 */
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    // Validación: al menos un campo debe ser enviado
    if (!datosActualizados.cinturon && !datosActualizados.fecha) {
      return res.status(400).json({
        mensaje:
          "Debe proporcionar al menos un campo para actualizar (cinturon o fecha)",
      });
    }

    // Si se está actualizando el cinturón, verificamos que exista
    if (datosActualizados.cinturon) {
      const cinturonExiste = await Cinturon.findById(
        datosActualizados.cinturon,
      );

      if (!cinturonExiste) {
        return res.status(400).json({
          mensaje: "El cinturón especificado no existe",
          cinturonId: datosActualizados.cinturon,
        });
      }
    }

    if (datosActualizados.fecha) {
      const fechaProporcionada = new Date(datosActualizados.fecha);
      const fechaActual = new Date();

      if (fechaProporcionada > fechaActual) {
        return res.status(400).json({
          mensaje: "No se puede registrar una fecha de concesión futura",
          fechaProporcionada: fechaProporcionada.toISOString(),
        });
      }
    }

    // Actualizamos el BeltDate
    // new: true → devuelve el documento actualizado (no el antiguo)
    // runValidators: true → ejecuta las validaciones del modelo
    const beltDateActualizado = await BeltDate.findByIdAndUpdate(
      id,
      datosActualizados,
      {
        new: true,
        runValidators: true,
      },
    ).populate("cinturon", "color grado");

    // Si no existe el BeltDate, respondemos con 404
    if (!beltDateActualizado) {
      return res.status(404).json({
        mensaje: "Registro de cinturón no encontrado",
        id: id,
      });
    }

    res.status(200).json(beltDateActualizado);
  } catch (error) {
    console.error("Error al actualizar beltDate:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        mensaje: "Error de validación",
        errores: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al actualizar el registro de cinturón",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: ELIMINAR UN BELTDATE ==========
/**
 * DELETE /api/beltdates/:id
 *
 * Elimina un registro de concesión de cinturón de la base de datos
 *
 * Respuesta exitosa: 200 con mensaje de confirmación
 * Respuesta no encontrado: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos y eliminamos en una sola operación
    const beltDateEliminado = await BeltDate.findByIdAndDelete(id);

    if (!beltDateEliminado) {
      return res.status(404).json({
        mensaje: "Registro de cinturón no encontrado",
        id: id,
      });
    }

    // Respondemos con mensaje de confirmación
    res.status(200).json({
      mensaje: "Registro de cinturón eliminado correctamente",
      beltDate: {
        id: beltDateEliminado._id,
        cinturon: beltDateEliminado.cinturon,
        fecha: beltDateEliminado.fecha,
      },
    });
  } catch (error) {
    console.error("Error al eliminar beltDate:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de registro inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al eliminar el registro de cinturón",
      error: "Error interno del servidor",
    });
  }
};

// ========== EXPORTACIONES ==========
// Exportamos todos los métodos del controlador para usarlos en las rutas
module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};
