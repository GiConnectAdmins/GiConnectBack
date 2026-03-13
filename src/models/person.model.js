// Importamos Mongoose para trabajar con MongoDB
const mongoose = require("mongoose");

// Importamos bcryptjs para hashear passwords de forma segura
const bcrypt = require("bcryptjs");

// ========== ENUMS (valores permitidos) ==========

// Roles disponibles en la aplicación
const ROLES = ["Admin", "Maestro", "Atleta"];

// Tipos de suscripción disponibles
const SUBSCRIPTIONS = ["mensual", "bono"];

// ========== DEFINICIÓN DEL ESQUEMA ==========

const PersonSchema = new mongoose.Schema(
  {
    // ===== CAMPOS OBLIGATORIOS =====
    // Son esenciales para identificar y contactar a la persona

    // Nombre de la persona (ej: "Carlos")
    nombre: {
      type: String,
      required: true, // Campo obligatorio
      trim: true, // Elimina espacios al inicio y final
    },

    // Apellidos de la persona (ej: "García López")
    // Cambiado a obligatorio (antes era opcional con default: "")
    apellidos: {
      type: String,
      required: true, // Ahora es obligatorio
      trim: true, // Elimina espacios al inicio y final
    },

    // Teléfono de contacto
    // Cambiado a obligatorio (antes era opcional con default: "")
    telefono: {
      type: String,
      required: true, // Ahora es obligatorio
    },

    // Email único para autenticación (NUEVO CAMPO)
    // Se usa para login y debe ser único en toda la aplicación
    email: {
      type: String,
      required: true, // Campo obligatorio
      unique: true, // No puede haber dos usuarios con el mismo email
      lowercase: true, // Convierte a minúsculas automáticamente
      trim: true, // Elimina espacios al inicio y final
      validate: {
        // Validación personalizada: verifica formato de email
        validator: function (email) {
          // Regex para validar formato básico de email
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "El formato del email no es válido",
      },
    },

    // Password hasheado para autenticación (NUEVO CAMPO)
// NUNCA se almacena en texto plano, siempre hasheado con bcrypt
password: {
  type: String,
  required: true,      // Campo obligatorio
  select: false,       // NO se devuelve en consultas por defecto (seguridad)
  validate: {
    // Validación personalizada para password seguro (nivel producción)
    validator: function(password) {
      // Regex para validar:
      // - Mínimo 8 caracteres
      // - Al menos 1 letra minúscula (a-z)
      // - Al menos 1 letra mayúscula (A-Z)
      // - Al menos 1 número (0-9)
      // - Al menos 1 carácter especial de: - _ / & % $ + = * @ #
      const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-_\/&%$+=*@#]).{8,}$/;
      return regex.test(password);
    },
    message: 
      "El password debe tener mínimo 8 caracteres, al menos 1 mayúscula, " +
      "1 minúscula, 1 número y 1 carácter especial de estos: - _ / & % $ + = * @ #)"
  }
},
// Nota: El password se hashea automáticamente en el middleware pre-save

    // ===== CAMPOS OPCIONALES =====

    // URL de la foto de perfil (opcional)
    foto: {
      type: String,
      default: "", // Por defecto, string vacío
    },

    // Edad de la persona en años (opcional)
    edad: {
      type: Number,
      min: 0, // No puede ser negativa
    },

    // Peso de la persona en kg (opcional)
    peso: {
      type: Number,
      min: 0, // No puede ser negativo
    },

    // Número de federación (opcional)
    // Para atletas federados en competiciones oficiales
    numeroFederacion: {
      type: String,
      default: "", // Por defecto, string vacío
    },

    // ===== CAMPOS CON VALORES POR DEFECTO =====

    // Rol del usuario en la aplicación
    rol: {
      type: String,
      enum: ROLES, // Solo puede ser uno de los valores del array ROLES
      default: "Atleta", // Por defecto, todos son atletas
    },

    // Referencia al cinturón actual de la persona (opcional)
    // null = sin cinturón asignado aún
    cinturon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cinturon",
      default: null, // Por defecto: null (antes era undefined)
    },

    // Historial de cinturones obtenidos (array de fechas de concesión)
    // Por defecto es un array vacío
    beltDates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BeltDate",
      },
    ],

    // Número de clases a las que ha asistido como alumno
    clasesAsistidas: {
      type: Number,
      default: 0, // Empieza en 0
      min: 0, // No puede ser negativo
    },

    // Número de clases que ha impartido como maestro
    clasesImpartidas: {
      type: Number,
      default: 0, // Empieza en 0
      min: 0, // No puede ser negativo
    },

    // Tipo de suscripción de pago (opcional)
    // null = sin suscripción activa
    suscripcion: {
      type: String,
      enum: SUBSCRIPTIONS, // Solo puede ser 'mensual' o 'bono'
      default: null, // Por defecto: null (antes era undefined)
    },

    // Equipo al que pertenece la persona (opcional)
    // null = sin equipo asignado
    equipo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Equipo",
      default: null, // Por defecto: null (antes era undefined)
    },

    // Equipos con los que tiene afiliación (array)
    // Por defecto es un array vacío
    afiliacion: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Equipo",
      },
    ],
  },
  {
    // timestamps: true crea automáticamente dos campos:
    // - createdAt: fecha de creación del documento
    // - updatedAt: fecha de última modificación
    timestamps: true,
  },
);

// ========== MIDDLEWARE PRE-SAVE: HASHEAR PASSWORD ==========

/**
 * Middleware que se ejecuta ANTES de guardar un documento Person en la DB
 *
 * Propósito: Hashear el password automáticamente antes de guardarlo
 *
 * ¿Cuándo se ejecuta?
 * - Al crear un nuevo usuario (registro)
 * - Al actualizar el password de un usuario existente
 *
 * ¿Cuándo NO se ejecuta?
 * - Al actualizar otros campos que NO sean password
 *
 * Seguridad: El password NUNCA se guarda en texto plano en la base de datos
 */
PersonSchema.pre("save", async function () {
  // this = el documento Person que se está guardando

  // Verificamos si el campo password fue modificado
  // Si NO fue modificado (por ejemplo, solo se actualizó el nombre),
  // no hacemos nada — en Mongoose 9 los hooks async no usan next()
  if (!this.isModified("password")) {
    return;
  }

  // Si llegamos aquí, significa que el password SÍ fue modificado
  // (nuevo usuario o cambio de password)

  // Generamos un "salt" (cadena aleatoria) para el hash
  // Salt rounds = 10: balance entre seguridad y rendimiento
  const salt = await bcrypt.genSalt(10);

  // Hasheamos el password con bcrypt usando el salt generado
  // El resultado es un hash irreversible que se guarda en la DB
  this.password = await bcrypt.hash(this.password, salt);
});

// ========== MÉTODOS DE INSTANCIA ==========

/**
 * Método para comparar un password ingresado con el hasheado en la DB
 *
 * Uso: En el login, cuando el usuario ingresa su password
 *
 * @param {String} passwordIngresado - Password en texto plano que ingresó el usuario
 * @returns {Boolean} - true si el password coincide, false si no
 *
 * Ejemplo de uso:
 * const esValido = await usuario.compararPassword('mipassword123');
 * if (esValido) {
 *   // Login exitoso
 * } else {
 *   // Password incorrecto
 * }
 */
PersonSchema.methods.compararPassword = async function (passwordIngresado) {
  // bcrypt.compare() compara el password en texto plano con el hash
  // Internamente, bcrypt usa el mismo salt que se usó al hashear
  return await bcrypt.compare(passwordIngresado, this.password);
};

// ========== CREACIÓN DEL MODELO ==========

// Creamos el modelo 'Person' a partir del esquema
// Mongoose creará automáticamente la colección 'people' en MongoDB
const Person = mongoose.model("Person", PersonSchema);

// ========== EXPORTACIONES ==========

// Exportamos el modelo para usarlo en otros archivos (controladores, rutas)
module.exports = Person;

// También exportamos los ENUMS para reutilizarlos (ej: en validaciones)
module.exports.ROLES = ROLES;
module.exports.SUBSCRIPTIONS = SUBSCRIPTIONS;
