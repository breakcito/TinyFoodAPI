import { IAService } from '../../../common/service/ia.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { UC_BuildIAContext } from './build-ia-context.uc';

interface RES_Receta {
  nombre: string;
  descripcion: string;
  tiempo_minutos: number;
  dificultad: 'fácil' | 'media' | 'difícil';
  porciones: number;
  ingredientes_usados: string[];
  ingredientes_extra: string[];
  pasos: string[];
  calorias_aprox: number;
  emoji: string;
}

const RECETA_SCHEMA = {
  type: 'object',
  properties: {
    recetas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          descripcion: { type: 'string' },
          tiempo_minutos: { type: 'integer' },
          dificultad: { type: 'string', enum: ['fácil', 'media', 'difícil'] },
          porciones: { type: 'integer' },
          ingredientes_usados: { type: 'array', items: { type: 'string' } },
          ingredientes_extra: { type: 'array', items: { type: 'string' } },
          pasos: { type: 'array', items: { type: 'string' } },
          calorias_aprox: { type: 'integer' },
          emoji: { type: 'string' },
        },
        required: [
          'nombre',
          'descripcion',
          'tiempo_minutos',
          'dificultad',
          'porciones',
          'ingredientes_usados',
          'ingredientes_extra',
          'pasos',
          'calorias_aprox',
          'emoji',
        ],
      },
    },
  },
  required: ['recetas'],
};

// Genera recetas personalizadas usando los alimentos disponibles del usuario,
// su dieta, alergias, preferencias y objetivo físico.
export class UC_RecomendarRecetas {
  static async execute(
    id_usuario: number,
    cantidad: number = 3,
  ): Promise<ApiResponse> {
    try {
      const { contextoUsuario, comidas } =
        await UC_BuildIAContext.execute(id_usuario);

      if (comidas.ordenadas.length === 0) {
        return SendResponse.error(
          'No tienes alimentos disponibles en tu despensa para generar recetas.',
        );
      }

      const listaIngredientes = comidas.ordenadas
        .map((c) => `- ${c.nombre} (${c.cantidad})`)
        .join('\n');

      const prompt = `
      Eres un chef y nutricionista experto integrado en TinyFood, una app de gestión de despensa.

      El usuario tiene estos ingredientes disponibles en su despensa (ordenados por urgencia de vencimiento):
      ${listaIngredientes}

      ${contextoUsuario ? `Contexto importante del usuario:\n${contextoUsuario}` : ''}

      Genera exactamente ${cantidad} recetas deliciosas y prácticas usando principalmente los ingredientes disponibles.
      Prioriza los ingredientes que aparecen primero en la lista (próximos a vencer).

      REGLAS OBLIGATORIAS DE COMPOSICIÓN:
      1. Coherencia de ingredientes: No intentes usar todos los ingredientes en una sola receta. Genera platos con sentido culinario y lógico (por ejemplo, si hay carne y arándanos, haz un plato con la carne, NO le agregues arándanos).
      2. Sin combinaciones absurdas: Prohibido mezclar frutas de sabor dulce (fresas, arándanos, etc.) en platos salados tradicionales con pollo, carne o pescado (como "ají de gallina con arándanos").
      3. Seguridad alimentaria: Bajo ninguna circunstancia sugieras aves o carnes crudas o marinadas en frío (está terminantemente prohibido el "ceviche de pollo").
      4. Si la receta necesita ingredientes comunes que el usuario no tiene en la despensa (como aceite, sal, cebolla o arroz), lístalos bajo "ingredientes_extra".
      5. Nombres reales y tradicionales: Las recetas deben tener nombres de platos reales, conocidos y apetitosos del mundo real. Evita nombres descriptivos o artificiales del tipo "[Ingrediente A] con [Ingrediente B]".
      6. Platos dulces vs salados: Si usas frutas dulces (como fresas, arándanos o plátanos), utilízalas únicamente para preparar recetas dulces lógicas (postres, desayunos, batidos, repostería o ensaladas de frutas).
      7. Cantidades y medidas: Debes ajustar las cantidades de los ingredientes según la cantidad de porciones que se indican. Si el usuario tiene solo 200g de pollo, la receta debe ser para 1 o 2 porciones, no para 4.
      `.trim();

      const response = await IAService.generate<{ recetas: RES_Receta[] }>(
        prompt,
        RECETA_SCHEMA,
        'recomendar_recetas',
      );

      const resultado = response?.recetas || [];

      if (!resultado.length) {
        return SendResponse.error(
          'No se pudieron generar recetas. Intenta nuevamente.',
        );
      }

      return SendResponse.success(
        resultado,
        `${resultado.length} recetas generadas con tu despensa`,
      );
    } catch (error) {
      console.error('[UC_RecomendarRecetas] Error:', error);
      return SendResponse.error(
        'Error al generar recetas. Intenta nuevamente.',
      );
    }
  }
}
