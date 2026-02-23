// Importamos Mongoose para trabajar con MongoDB
const mongoose = require('mongoose');

// ========== ENUMS (valores permitidos) ==========

// Tipos de clase disponibles
const TIPOS_CLASE = [
  'recurrente',  // Clases que se repiten cada semana (ej: todos los lunes)
  'especial'     // Clases únicas en una fecha específica (ej: seminarios)
];

// Días de la semana permitidos (para clases recurrentes)
const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo'
];

// Horarios disponibles para las clases
const HORARIOS = [
  '10:00-11:30',
  '18:00-19:30',
  '19:30-21:00'
];

// ========== DEFINICIÓN DEL ESQUEMA ==========

const ClaseSchema = new mongoose.Schema({
  
  // Título de la clase (ej: 'Judo Infantil', 'Karate Avanzado')
  titulo: { 
    type: String,        // Tipo de dato: texto
    required: true,      // Campo obligatorio
    trim: true           // Elimina espacios al inicio y final
  },
  
  // Tipo de clase: recurrente (semanal) o especial (fecha única)
  tipo: { 
    type: String,
    enum: TIPOS_CLASE,   // Solo puede ser 'recurrente' o 'especial'
    required: true
  },
  
  // Fecha específica (SOLO para clases de tipo 'especial')
  // Para clases recurrentes, este campo no se usa
  fecha: { 
    type: Date,
    required: function() {
      // Este campo es obligatorio SOLO si el tipo es 'especial'
      return this.tipo === 'especial';
    }
  },
  
  // Día de la semana (SOLO para clases de tipo 'recurrente')
  // Para clases especiales, este campo no se usa
  diaSemana: { 
    type: String,
    enum: DIAS_SEMANA,   // Solo puede ser uno de los días definidos arriba
    required: function() {
      // Este campo es obligatorio SOLO si el tipo es 'recurrente'
      return this.tipo === 'recurrente';
    }
  },
  
  // Horario de la clase (ej: '18:00-19:30')
  hora: { 
    type: String,
    enum: HORARIOS,      // Solo puede ser uno de los horarios definidos arriba
    required: true
  },
  
  // Número máximo de atletas que pueden asistir a la clase
  aforoMaximo: { 
    type: Number,        // Tipo de dato: número entero
    required: true,
    min: 1,              // Mínimo 1 persona (validación)
    validate: {
      // Validación personalizada: debe ser un número entero
      validator: Number.isInteger,
      message: 'El aforo máximo debe ser un número entero'
    }
  },
  
  // ========== CAMPO MAESTRO ==========
  // Referencia a la persona que imparte la clase (debe tener rol 'Maestro')
  // Se relaciona con el modelo Person mediante su ObjectId
  maestro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',       // Referencia al modelo Person
    required: true       // Toda clase debe tener un maestro asignado
  }
  
}, { 
  // timestamps: true crea automáticamente dos campos:
  // - createdAt: fecha de creación del documento
  // - updatedAt: fecha de última modificación
  timestamps: true 
});

// ========== VALIDACIÓN PERSONALIZADA ==========

// Validación a nivel de documento: verificar coherencia entre tipo y campos
ClaseSchema.pre('save', function() {
  // Si es clase recurrente, NO debe tener fecha
  if (this.tipo === 'recurrente' && this.fecha) {
    throw new Error('Una clase recurrente no debe tener campo "fecha"');
  }
  
  // Si es clase especial, NO debe tener diaSemana
  if (this.tipo === 'especial' && this.diaSemana) {
    throw new Error('Una clase especial no debe tener campo "diaSemana"');
  }
  
  // Si todo está bien, no hacemos nada (la validación pasa)
});

// ========== MÉTODOS DEL MODELO ==========

// Método para obtener una descripción legible de la clase
// Este método me lo ha recomendado Claude para envio de recordatorios, etc...
ClaseSchema.methods.obtenerDescripcion = function() {
  if (this.tipo === 'recurrente') {
    return `${this.titulo} - Todos los ${this.diaSemana} a las ${this.hora}`;
  } else {
    const fechaFormateada = this.fecha.toLocaleDateString('es-ES');
    return `${this.titulo} - ${fechaFormateada} a las ${this.hora}`;
  }
};

// ========== CREACIÓN DEL MODELO ==========

// Creamos el modelo 'Clase' a partir del esquema
// Mongoose creará automáticamente la colección 'clases' en MongoDB
const Clase = mongoose.model('Clase', ClaseSchema);

// ========== EXPORTACIONES ==========

// Exportamos el modelo para usarlo en otros archivos (rutas, controladores)
module.exports = Clase;

// También exportamos los ENUMS para reutilizarlos (ej: en validaciones del frontend)
module.exports.TIPOS_CLASE = TIPOS_CLASE;
module.exports.DIAS_SEMANA = DIAS_SEMANA;
module.exports.HORARIOS = HORARIOS;