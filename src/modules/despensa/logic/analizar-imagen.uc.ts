import { IAService } from '../../../common/service/ia.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { FoodTags } from 'src/common/utils/variables/food-tags';

export interface RES_AnalizarImagenItem {
  nombre: string;
  cantidad: string;
  categoria: string;
  tags: string[];
  descripcion: string;
  dias_duracion_estimados: number;
  fecha_vencimiento?: string; // ISO string
}

export class UC_AnalizarImagen {
  static async execute(foto_b64: string): Promise<ApiResponse> {
    try {
      const prompt = `
      Eres un experto en nutrición y gastronomía integrado en TinyFood, una app de gestión de despensa inteligente.

      Analiza la imagen e identifica todas las comidas, alimentos o bebidas individuales que contenga. Si consideras que hay más de un alimento o comida que se pueda separar (por ejemplo, si en una sola foto hay un plato de arroz con pollo, dos manzanas y una gaseosa), sepáralos en elementos independientes en la lista de alimentos, asignando la información correspondiente a cada uno.
      Evita colocar una descripción que no aporta nada al control de la despensa. Si no sabes qué alimento es, no lo inventes ni intentes adivinar.

      Para las etiquetas (tags) de cada alimento, selecciona estrictamente de la siguiente lista de etiquetas disponibles (elige entre 3 y 6 etiquetas):
      ${FoodTags.join(', ')}

      [REGLA DE FORMATO OBLIGATORIA]: Devuelve ÚNICAMENTE un OBJETO JSON que comience con '{' y termine con '}' con la propiedad raíz "alimentos".
      `.trim();

      const schema = {
        type: 'object',
        properties: {
          alimentos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                cantidad: { type: 'string' },
                categoria: {
                  type: 'string',
                  enum: FoodTags,
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: FoodTags,
                  },
                },
                descripcion: { type: 'string' },
                dias_duracion_estimados: { type: 'integer' },
              },
              required: [
                'nombre',
                'cantidad',
                'categoria',
                'tags',
                'descripcion',
                'dias_duracion_estimados',
              ],
              additionalProperties: false,
            },
          },
        },
        required: ['alimentos'],
        additionalProperties: false,
      };

      const response = await IAService.analyzeImage<{
        alimentos: RES_AnalizarImagenItem[];
      }>(foto_b64, prompt, schema, 'analisis_alimentos');

      const resultado = response?.alimentos || [];

      if (!resultado || resultado.length === 0) {
        return SendResponse.error(
          'No se pudo identificar ningún alimento en la imagen. Intenta con una foto más clara.',
        );
      }

      const alimentosMapeados = resultado
        .filter((item) => item.nombre && item.nombre.trim() !== '')
        .map((item) => {
          const fechaVencimientoEstimada =
            item.dias_duracion_estimados > 0
              ? new Date(
                  Date.now() +
                    item.dias_duracion_estimados * 24 * 60 * 60 * 1000,
                ).toISOString()
              : undefined;

          return {
            nombre: item.nombre,
            cantidad: item.cantidad,
            categoria: item.categoria,
            tags: item.tags,
            descripcion: item.descripcion,
            dias_duracion_estimados: item.dias_duracion_estimados,
            fecha_vencimiento: fechaVencimientoEstimada,
          };
        });

      if (alimentosMapeados.length === 0) {
        return SendResponse.error(
          'No se pudo identificar ningún alimento válido en la imagen. Intenta de nuevo.',
        );
      }

      return SendResponse.success(
        alimentosMapeados,
        `Identificado(s) ${alimentosMapeados.length} alimento(s) con éxito`,
      );
    } catch (error) {
      console.error('[UC_AnalizarImagen] Error:', error);
      return SendResponse.error(
        'Error al analizar la imagen. Intenta nuevamente.',
      );
    }
  }
}
