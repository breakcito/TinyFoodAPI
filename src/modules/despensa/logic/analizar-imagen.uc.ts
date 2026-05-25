import { GeminiService } from '../../../common/service/gemini.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';

interface GeminiAnalisisAlimento {
  nombre: string;
  cantidad: string;
  categoria: string;
  tags: string[];
  notas: string;
  dias_duracion_estimados: number;
  confianza: 'alta' | 'media' | 'baja';
}

// Array maestro de etiquetas — la IA elige las más relevantes
const TAGS_DISPONIBLES = [
  // Estado y frescura
  'fresco','maduro','verde','seco','congelado','enlatado','procesado','orgánico','natural',
  // Tipo de alimento
  'fruta','verdura','legumbre','cereal','lácteo','proteína','carne','pescado','mariscos',
  'huevo','semilla','nuez','aceite','condimento','especia','bebida','snack','dulce','pan',
  // Características nutricionales
  'alto en proteína','alto en fibra','alto en vitamina C','rico en potasio','bajo en calorías',
  'alto en calcio','fuente de hierro','rico en omega-3','antioxidante','bajo en grasa',
  // Dieta
  'vegano','vegetariano','sin gluten','sin lactosa','keto','paleo','sin azúcar',
  // Preparación
  'listo para comer','requiere cocción','requiere refrigeración','no perecedero',
  // Color (útil para búsqueda)
  'rojo','verde','amarillo','naranja','morado','blanco','marrón',
  // Origen
  'tropical','importado','local','de temporada',
  // Uso culinario
  'para desayuno','para almuerzo','para cena','para snack','para bebida','para postre',
  'para ensalada','para sopa','para batido','para horneado',
];

export class UC_AnalizarImagen {
  static async execute(
    foto_b64: string,
    mimeType: string = 'image/jpeg',
  ): Promise<ApiResponse> {
    try {
      const prompt = `
Eres un experto en nutrición y gastronomía integrado en TinyFood, una app de gestión de despensa.

Analiza la imagen e identifica el alimento principal.

LISTA DE ETIQUETAS DISPONIBLES (elige entre 3 y 6 que mejor describan el alimento):
${TAGS_DISPONIBLES.join(', ')}

Devuelve ÚNICAMENTE este objeto JSON (sin texto adicional, sin markdown):
{
  "nombre": "nombre común del alimento en español (ej: plátano, leche entera, pechuga de pollo)",
  "cantidad": "cantidad estimada con unidad (ej: '4 unidades', '500g', '1 litro')",
  "categoria": "una de: fruta | verdura | lácteo | proteína | cereal | bebida | condimento | snack | otro",
  "tags": ["etiqueta1", "etiqueta2", "etiqueta3"],
  "notas": "información nutricional y de almacenamiento útil para el usuario (ej: 'Rico en potasio y vitamina B6. Conservar a temperatura ambiente hasta madurar, luego refrigerar. Ideal para batidos y postres.')",
  "dias_duracion_estimados": número entero de días que suele durar en condiciones normales,
  "confianza": "alta | media | baja según qué tan seguro estás"
}

Si no identificas ningún alimento, devuelve el mismo schema con nombre vacío y confianza "baja".
      `.trim();

      const gemini = GeminiService.instance;
      if (!gemini) return SendResponse.error('Servicio de IA no disponible');

      const resultado = await gemini.generateFromImage<GeminiAnalisisAlimento>(
        foto_b64,
        mimeType,
        prompt,
      );

      if (!resultado.nombre || resultado.confianza === 'baja') {
        return SendResponse.error(
          'No se pudo identificar un alimento en la imagen. Intenta con una foto más clara.',
        );
      }

      const fechaVencimientoEstimada =
        resultado.dias_duracion_estimados > 0
          ? new Date(
              Date.now() +
                resultado.dias_duracion_estimados * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined;

      // Convertir array de tags a string separado por coma
      const tagsString = Array.isArray(resultado.tags)
        ? resultado.tags.join(',')
        : resultado.tags ?? '';

      return SendResponse.success(
        {
          nombre: resultado.nombre,
          cantidad: resultado.cantidad,
          categoria: resultado.categoria,
          tags: tagsString,
          descripcion: resultado.notas,
          dias_duracion_estimados: resultado.dias_duracion_estimados,
          fecha_vencimiento: fechaVencimientoEstimada,
          confianza: resultado.confianza,
        },
        `Alimento identificado: ${resultado.nombre}`,
      );
    } catch (error) {
      console.error('[UC_AnalizarImagen] Error:', error);
      return SendResponse.error('Error al analizar la imagen. Intenta nuevamente.');
    }
  }
}