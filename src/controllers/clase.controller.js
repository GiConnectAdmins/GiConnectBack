// ========== IMPORTACIONES ==========
// Importamos el modelo Clase para interactuar con la base de datos
const Clase = require("../models/clase.model");

// Importamos el modelo Person para que Mongoose lo registre (necesario para populate)
const Person = require("../models/person.model");

// ========== CONTROLADOR: LISTAR TODAS LAS CLASES (CON FILTROS OPCIONALES) ==========
/**
 * GET /api/clases
 *
 * Obtiene todas las clases, con posibilidad de filtrar por:
 * - maestro (ObjectId)
 * - tipo ('recurrente' o 'especial')
 * - titulo (búsqueda parcial, case-insensitive)
 *
 * Query params opcionales:
 * - ?maestro=64f3a1b2... → Filtra por maestro específico
 * - ?tipo=recurrente → Filtra por tipo de clase
 * - ?titulo=Judo → Busca clases cuyo título contenga "Judo"
 * - Se pueden combinar: ?maestro=...&tipo=recurrente
 *
 * Respuesta exitosa: 200 con array de clases (ordenadas por fecha de creación desc)
 * Respuesta con error: 500 con mensaje genérico
 */
const getAll = async (req, res) => {
  try {
    // Construimos el objeto de filtros dinámicamente según los query params
    const filtros = {};

    // Si viene el parámetro 'maestro', lo añadimos al filtro
    if (req.query.maestro) {
      filtros.maestro = req.query.maestro;
    }

    // Si viene el parámetro 'tipo', lo añadimos al filtro
    if (req.query.tipo) {
      filtros.tipo = req.query.tipo;
    }

    // Si viene el parámetro 'titulo', hacemos búsqueda parcial (regex)
    // $regex permite buscar coincidencias parciales
    // $options: 'i' hace la búsqueda case-insensitive (mayús/minús da igual)
    if (req.query.titulo) {
      filtros.titulo = { $regex: req.query.titulo, $options: "i" };
    }

    // Buscamos en la base de datos con los filtros aplicados
    // .populate('maestro') trae los datos completos del maestro (no solo el ObjectId)
    // .sort({ createdAt: -1 }) ordena por fecha de creación descendente (más reciente primero)
    const clases = await Clase.find(filtros)
      .populate("maestro", "nombre apellidos rol") // Solo traemos nombre, apellidos y rol del maestro
      .sort({ createdAt: -1 });

    // Respondemos con las clases encontradas
    res.status(200).json(clases);
  } catch (error) {
    // Si hay un error, lo registramos en consola (para debugging)
    console.error("Error al obtener clases:", error);

    // Respondemos con error 500 (error interno del servidor)
    // NO exponemos detalles del error al cliente por seguridad
    res.status(500).json({
      mensaje: "Error al obtener las clases",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: OBTENER UNA CLASE POR ID ==========
/**
 * GET /api/clases/:id
 *
 * Obtiene una clase específica por su ID
 * Incluye los datos del maestro (populate)
 *
 * Respuesta exitosa: 200 con el objeto clase
 * Respuesta no encontrado: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const getById = async (req, res) => {
  try {
    // Extraemos el id de los parámetros de la URL
    const { id } = req.params;

    // Buscamos la clase por ID y poblamos el campo maestro
    const clase = await Clase.findById(id).populate(
      "maestro",
      "nombre apellidos rol telefono email",
    );

    // Si no existe la clase, respondemos con 404
    if (!clase) {
      return res.status(404).json({
        mensaje: "Clase no encontrada",
        id: id,
      });
    }

    // Si existe, la devolvemos
    res.status(200).json(clase);
  } catch (error) {
    console.error("Error al obtener clase por ID:", error);

    // Si el error es por ID inválido (formato incorrecto), devolvemos 400
    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de clase inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al obtener la clase",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: CREAR UNA NUEVA CLASE ==========
/**
 * POST /api/clases
 *
 * Crea una nueva clase en la base de datos
 *
 * Body esperado (JSON):
 * {
 *   "titulo": "Judo Infantil",
 *   "tipo": "recurrente" | "especial",
 *   "diaSemana": "Lunes" (solo si tipo es recurrente),
 *   "fecha": "2026-03-15" (solo si tipo es especial),
 *   "hora": "18:00-19:30",
 *   "aforoMaximo": 20,
 *   "maestro": "64f3a1b2..."
 * }
 *
 * Validaciones:
 * - Todos los campos obligatorios según el tipo
 * - Clase recurrente: debe tener diaSemana, NO debe tener fecha
 * - Clase especial: debe tener fecha, NO debe tener diaSemana
 *
 * Respuesta exitosa: 201 con el objeto creado
 * Respuesta con validación fallida: 400 con detalles
 * Respuesta con error: 500 con mensaje genérico
 */
const create = async (req, res) => {
  try {
    // Extraemos los datos del body de la petición
    const { titulo, tipo, fecha, diaSemana, hora, aforoMaximo, maestro } =
      req.body;

    // ===== VALIDACIONES MANUALES ADICIONALES =====

    // Validación: si es recurrente, debe tener diaSemana y NO fecha
    if (tipo === "recurrente") {
      if (!diaSemana) {
        return res.status(400).json({
          mensaje: 'Una clase recurrente debe tener el campo "diaSemana"',
        });
      }
      if (fecha) {
        return res.status(400).json({
          mensaje: 'Una clase recurrente no debe tener el campo "fecha"',
        });
      }
    }

    // Validación: si es especial, debe tener fecha y NO diaSemana
    if (tipo === "especial") {
      if (!fecha) {
        return res.status(400).json({
          mensaje: 'Una clase especial debe tener el campo "fecha"',
        });
      }
      if (diaSemana) {
        return res.status(400).json({
          mensaje: 'Una clase especial no debe tener el campo "diaSemana"',
        });
      }
    }

    // Creamos la nueva clase con los datos recibidos
    const nuevaClase = new Clase({
      titulo,
      tipo,
      fecha: tipo === "especial" ? fecha : undefined,
      diaSemana: tipo === "recurrente" ? diaSemana : undefined,
      hora,
      aforoMaximo,
      maestro,
    });

    // Guardamos en la base de datos
    // Las validaciones del modelo (required, enum, etc.) se ejecutan aquí
    await nuevaClase.save();

    // Poblamos el campo maestro antes de devolver la respuesta
    await nuevaClase.populate("maestro", "nombre apellidos rol");

    // Respondemos con 201 (creado) y el objeto creado
    res.status(201).json(nuevaClase);
  } catch (error) {
    console.error("Error al crear clase:", error);

    // Si el error es de validación de Mongoose, devolvemos 400 con detalles
    if (error.name === "ValidationError") {
      return res.status(400).json({
        mensaje: "Error de validación",
        errores: Object.values(error.errors).map((err) => err.message),
      });
    }

    res.status(500).json({
      mensaje: "Error al crear la clase",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: ACTUALIZAR UNA CLASE ==========
/**
 * PUT /api/clases/:id
 *
 * Actualiza una clase existente
 * Permite actualizar cualquier campo
 * Valida coherencia entre tipo y campos asociados
 *
 * Body (JSON): campos a actualizar
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

    // Buscamos la clase antes de actualizar para validaciones
    const claseExistente = await Clase.findById(id);

    if (!claseExistente) {
      return res.status(404).json({
        mensaje: "Clase no encontrada",
        id: id,
      });
    }

    // ===== VALIDACIONES DE COHERENCIA AL ACTUALIZAR =====

    // Determinamos el tipo final (el que viene en body o el que ya tenía)
    const tipoFinal = datosActualizados.tipo || claseExistente.tipo;

    // Si el tipo final es 'recurrente', validamos
    if (tipoFinal === "recurrente") {
      // Si se está enviando fecha, es un error
      if (datosActualizados.fecha) {
        return res.status(400).json({
          mensaje: 'Una clase recurrente no puede tener el campo "fecha"',
        });
      }
      // Si NO tiene diaSemana (ni en body ni en DB), es un error
      if (!datosActualizados.diaSemana && !claseExistente.diaSemana) {
        return res.status(400).json({
          mensaje: 'Una clase recurrente debe tener el campo "diaSemana"',
        });
      }
    }

    // Si el tipo final es 'especial', validamos
    if (tipoFinal === "especial") {
      // Si se está enviando diaSemana, es un error
      if (datosActualizados.diaSemana) {
        return res.status(400).json({
          mensaje: 'Una clase especial no puede tener el campo "diaSemana"',
        });
      }
      // Si NO tiene fecha (ni en body ni en DB), es un error
      if (!datosActualizados.fecha && !claseExistente.fecha) {
        return res.status(400).json({
          mensaje: 'Una clase especial debe tener el campo "fecha"',
        });
      }
    }

    // Actualizamos la clase
    // new: true → devuelve el documento actualizado (no el antiguo)
    // runValidators: true → ejecuta las validaciones del modelo
    const claseActualizada = await Clase.findByIdAndUpdate(
      id,
      datosActualizados,
      {
        new: true,
        runValidators: true,
      },
    ).populate("maestro", "nombre apellidos rol");

    res.status(200).json(claseActualizada);
  } catch (error) {
    console.error("Error al actualizar clase:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        mensaje: "Error de validación",
        errores: Object.values(error.errors).map((err) => err.message),
      });
    }

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de clase inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al actualizar la clase",
      error: "Error interno del servidor",
    });
  }
};

// ========== CONTROLADOR: ELIMINAR UNA CLASE ==========
/**
 * DELETE /api/clases/:id
 *
 * Elimina una clase de la base de datos
 *
 * Respuesta exitosa: 200 con mensaje de confirmación
 * Respuesta no encontrado: 404 con mensaje
 * Respuesta con error: 500 con mensaje genérico
 */
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscamos y eliminamos en una sola operación
    const claseEliminada = await Clase.findByIdAndDelete(id);

    if (!claseEliminada) {
      return res.status(404).json({
        mensaje: "Clase no encontrada",
        id: id,
      });
    }

    // Respondemos con mensaje de confirmación
    res.status(200).json({
      mensaje: "Clase eliminada correctamente",
      clase: {
        id: claseEliminada._id,
        titulo: claseEliminada.titulo,
      },
    });
  } catch (error) {
    console.error("Error al eliminar clase:", error);

    if (error.kind === "ObjectId") {
      return res.status(400).json({
        mensaje: "ID de clase inválido",
        id: req.params.id,
      });
    }

    res.status(500).json({
      mensaje: "Error al eliminar la clase",
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
