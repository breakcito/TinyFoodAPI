// Caso de uso: recibe una foto en base64, la envía a Gemini y devuelve los
// datos del alimento identificado para auto-rellenar el formulario del cliente.
// Accede a GeminiService a través de su instancia estática (compatible con la
// arquitectura NestJS del proyecto sin necesidad de inyección directa).

import { GeminiService } from '../../../common/service/gemini.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';

// ── Schema que Gemini debe devolver ──────────────────────────────────────────

interface GeminiAnalisisAlimento {
  nombre: string;
  cantidad: string;
  categoria: string;
  tags: string;
  descripcion: string;
  dias_duracion_estimados: number;
  confianza: 'alta' | 'media' | 'baja';
}

// ── Caso de uso ───────────────────────────────────────────────────────────────

export class UC_AnalizarImagen {
  static async execute(
    foto_b64: string,
    mimeType: string = 'image/jpeg',
  ): Promise<ApiResponse> {
    try {
      const prompt = `
Eres un asistente experto en identificación de alimentos para una app de gestión de despensa.

Analiza la imagen e identifica el alimento principal que aparece.

Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin texto adicional, sin markdown):
{
  "nombre": "nombre común del alimento en español",
  "cantidad": "cantidad estimada con unidad (ej: '6 unidades', '500g', '1 litro', '1 bolsa pequeña')",
  "categoria": "una de: fruta | verdura | lácteo | proteína | cereal | bebida | condimento | snack | otro",
  "tags": "etiquetas separadas por coma, máximo 4 (ej: 'fruta,tropical,dulce,fresco')",
  "descripcion": "descripción breve en 1 oración de lo que ves en la imagen",
  "dias_duracion_estimados": número entero de días que suele durar este alimento en condiciones normales,
  "confianza": "alta | media | baja según qué tan seguro estás de la identificación"
}

Si no identificas ningún alimento, devuelve el mismo schema con nombre vacío ("") y confianza "baja".
      `.trim();

      // Accedemos al servicio a través de la instancia estática registrada
      // por NestJS al inicializar el módulo (GeminiService.instance = this)
      const gemini = GeminiService.instance;

      if (!gemini) {
        console.error('[UC_AnalizarImagen] GeminiService.instance no disponible');
        return SendResponse.error('Servicio de IA no disponible');
      }

      const resultado = await gemini.generateFromImage<GeminiAnalisisAlimento>(
        foto_b64,
        mimeType,
        prompt,
      );

      // La IA no identificó nada con suficiente confianza
      if (!resultado.nombre || resultado.confianza === 'baja') {
        return SendResponse.error(
          'No se pudo identificar un alimento en la imagen. Intenta con una foto más clara.',
        );
      }

      // Calcular fecha de vencimiento estimada desde hoy
      const fechaVencimientoEstimada =
        resultado.dias_duracion_estimados > 0
          ? new Date(
              Date.now() +
                resultado.dias_duracion_estimados * 24 * 60 * 60 * 1000,
            ).toISOString()
          : undefined;

      return SendResponse.success(
        {
          nombre: resultado.nombre,
          cantidad: resultado.cantidad,
          categoria: resultado.categoria,
          tags: resultado.tags,
          descripcion: resultado.descripcion,
          dias_duracion_estimados: resultado.dias_duracion_estimados,
          fecha_vencimiento: fechaVencimientoEstimada,
          confianza: resultado.confianza,
        },
        `Alimento identificado: ${resultado.nombre}`,
      );
    } catch (error: unknown) {
      console.error(
        '[UC_AnalizarImagen] Error completo:',
        JSON.stringify(error, null, 2),
      );

      if (error instanceof Error) {
        console.error('[UC_AnalizarImagen] Message:', error.message);
        console.error('[UC_AnalizarImagen] Stack:', error.stack);
      }

      return SendResponse.error('Error al analizar la imagen. Intenta nuevamente.');
    }
  }
}
