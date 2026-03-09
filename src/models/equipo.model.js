// Importamos Mongoose para trabajar con MongoDB
const mongoose = require("mongoose");

// ========== DEFINICIÓN DEL ESQUEMA ==========

const EquipoSchema = new mongoose.Schema(
  {
    // ===== CAMPOS OBLIGATORIOS =====
    // Son esenciales para identificar y contactar al equipo
    
    // Nombre del equipo/dojo (ej: "Dojo Jerez", "Gracie Barra Madrid")
    nombre: { 
      type: String, 
      required: true,  // Campo obligatorio
      trim: true       // Elimina espacios al inicio y final
    },
    
    // Dirección física del equipo
    // Obligatoria porque necesitamos saber dónde está ubicado
    direccion: { 
      type: String, 
      required: true,  // Cambiado de default: "" a required: true
      trim: true       // Elimina espacios al inicio y final
    },
    
    // Teléfono de contacto del equipo
    // Obligatorio para poder contactar con el equipo
    telefono: { 
      type: String, 
      required: true   // Cambiado de default: "" a required: true
    },
    
    // URL de la foto del logo del equipo
    // Obligatoria para identificación visual del equipo
    fotoLogo: { 
      type: String, 
      required: true   // Cambiado de default: "" a required: true
    },
    
    // ===== CAMPOS OPCIONALES =====
    
    // Array de URLs de fotos adicionales del equipo (instalaciones, eventos, etc.)
    // Opcional: puede estar vacío
    fotos: { 
      type: [String],  // Array de strings (URLs)
      default: []      // Por defecto, array vacío
    },
    
    // ===== RELACIONES CON OTROS MODELOS =====
    
    // Maestros responsables/titulares de este equipo
    // Array de referencias al modelo Person (solo personas con rol 'Maestro')
    // Puede estar vacío para equipos de otras ciudades creados solo por publicidad
    maestrosResponsables: [
      { 
        type: mongoose.Schema.Types.ObjectId,  // Tipo ObjectId (referencia)
        ref: "Person"                          // Referencia al modelo Person
      }
    ],
    // Nota: La validación de que sean realmente Maestros se hace en el controlador
    
    // Afiliación: equipos asociados o afiliados a este equipo
    // Puede contener 0 o más equipos (referencias a otros documentos Equipo)
    // Ejemplo: Equipo principal tiene afiliados varios equipos locales
    afiliacion: [
      { 
        type: mongoose.Schema.Types.ObjectId,  // Tipo ObjectId (referencia)
        ref: "Equipo"                          // Referencia al mismo modelo Equipo (auto-referencia)
      }
    ],
  },
  { 
    // timestamps: true crea automáticamente dos campos:
    // - createdAt: fecha de creación del documento
    // - updatedAt: fecha de última modificación
    timestamps: true 
  }
);

// ========== MÉTODOS DEL MODELO (OPCIONAL) ==========

// Método para obtener una descripción completa del equipo
// Útil para logs, notificaciones, etc.
EquipoSchema.methods.obtenerDescripcion = function() {
  return `${this.nombre} - ${this.direccion} - Tel: ${this.telefono}`;
};

// ========== CREACIÓN DEL MODELO ==========

// Creamos el modelo 'Equipo' a partir del esquema
// Mongoose creará automáticamente la colección 'equipos' en MongoDB
const Equipo = mongoose.model("Equipo", EquipoSchema);

// ========== EXPORTACIÓN ==========

// Exportamos el modelo para usarlo en otros archivos (controladores, rutas)
module.exports = Equipo;