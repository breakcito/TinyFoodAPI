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
      Eres un chef y nutricionista experto en cocina real, casera, popular y tradicional.

      El usuario tiene los siguientes ítems registrados en su despensa (ordenados por urgencia de vencimiento):
      ${listaIngredientes}

      ${contextoUsuario ? `Contexto importante del usuario (estilos culinarios, restricciones, metas):\n${contextoUsuario}` : ''}

      Genera exactamente ${cantidad} recetas deliciosas, realistas y prácticas.

      REGLAS DE ORO DE REALISMO CULINARIO Y COMIDA CASERA:
      1. PLATILLOS REALES Y COTIDIANOS: Las recetas DEBEN ser platillos reales, existentes, populares y tradicionales de la comida casera o familiar del día a día (ej. locro de zapallo, arroz a la cubana, menestra con arroz y huevo o pescado frito, tortilla de verduras, arroz chaufa, pollo al horno, puré de papas con guiso, etc.), alineados al contexto gastronómico del usuario. Queda ESTRICTAMENTE PROHIBIDO inventar recetas artificiales o nombres estrafalarios solo para intentar gastar productos raros de la despensa.
      2. CLASIFICACIÓN Y MANEJO DE INSUMOS:
         - Clasifica mentalmente los productos en: (A) Insumos de cocina base (carnes, verduras, tubérculos, menestras, huevos, lácteos básicos), (B) Postres/Snacks/Panadería (panetón, galletas, chocolates, dulces), (C) Licores/Bebidas alcohólicas (ron, cerveza, vino).
         - NUNCA mezcles licores o dulces/panetón en platos principales salados o desayunos nutritivos diarios.
         - Si un ítem es un licor o bebida alcohólica, NO lo uses como ingrediente de comida a menos que sea un marinado tradicional legítimo (ej. seco de res con chicha/cerveza) o un postre adulto específico. NUNCA sugieras "tostadas francesas con ron" ni híbridos extraños.
      3. LIBERTAD DE INGREDIENTES BÁSICOS ("ingredientes_extra"):
         - Si la despensa carece de ingredientes base para armar un platillo real completo, o solo contiene insumos secundarios/snacks, apóyate LIBREMENTE en ingredientes básicos habituales de cualquier cocina (como arroz, huevos, papas, cebolla, ajo, aceite, tomate, sal o harina) y lístalos bajo "ingredientes_extra".
         - No estás obligado a usar todos los productos de la despensa en una sola receta. Usa solo los ingredientes de la despensa que tengan sentido culinario lógico para el platillo.
      4. COHERENCIA DULCE VS SALADO:
         - Frutas dulces, panetón o galletas solo se usan en desayunos, meriendas o postres lógicos. NUNCA los mezcles en guisos o platos salados principales.
      5. SEGURIDAD ALIMENTARIA: Prohibido sugerir aves o carnes crudas o desinfectadas en frío (prohibido "ceviche de pollo").
      6. RESTRICCIONES Y ALERGIAS: Respeta al 100% cualquier alimento prohibido o alergia declarada en el contexto del usuario.
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
