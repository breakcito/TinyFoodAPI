// Genera recetas personalizadas usando los alimentos disponibles del usuario,
// su dieta, alergias, preferencias y objetivo físico.

import { GeminiService } from '../../../common/service/gemini.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { ComidaData } from '../data/comida.data';
import { UserData } from '../../usuario/data/usuario.data';

// ── Schema de respuesta ───────────────────────────────────────────────────────

interface GeminiReceta {
  nombre: string; // "Tortilla de papa con cebolla"
  descripcion: string; // Descripción breve apetitosa
  tiempo_minutos: number; // Tiempo total estimado
  dificultad: 'fácil' | 'media' | 'difícil';
  porciones: number;
  ingredientes_usados: string[]; // De la despensa del usuario
  ingredientes_extra: string[]; // Que podría necesitar comprar
  pasos: string[]; // Pasos numerados
  calorias_aprox: number;
  emoji: string;
}

interface GeminiRespuestaRecetas {
  recetas: GeminiReceta[];
}

export class UC_RecomendarRecetas {
  static async execute(
    id_usuario: number,
    cantidad: number = 3,
  ): Promise<ApiResponse> {
    try {
      // ── 1. Obtener alimentos disponibles (solo "Por consumir") ────────────
      const todasLasComidas = await ComidaData.findAllByUserId(id_usuario);
      const disponibles = todasLasComidas.filter(
        (c) => c.estado === 'Por consumir',
      );

      if (disponibles.length === 0) {
        return SendResponse.error(
          'No tienes alimentos disponibles en tu despensa para generar recetas.',
        );
      }

      // ── 2. Obtener perfil del usuario ─────────────────────────────────────
      const usuario = await UserData.findById(id_usuario);

      // Lista priorizada: primero los que vencen antes
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const alimentosOrdenados = disponibles
        .sort((a, b) => {
          if (!a.fecha_vencimiento) return 1;
          if (!b.fecha_vencimiento) return -1;
          return (
            new Date(a.fecha_vencimiento).getTime() -
            new Date(b.fecha_vencimiento).getTime()
          );
        })
        .slice(0, 15); // Máximo 15 para no saturar el prompt

      const listaIngredientes = alimentosOrdenados
        .map((c) => `- ${c.nombre} (${c.cantidad})`)
        .join('\n');

      // ── 3. Construir contexto del usuario ─────────────────────────────────
      const restricciones: string[] = [];
      if (usuario?.alimentos_prohibidos?.length) {
        restricciones.push(
          `NUNCA uses estos ingredientes (alergias/prohibidos): ${usuario.alimentos_prohibidos.join(', ')}`,
        );
      }

      const preferencias = usuario?.preferencias?.length
        ? `Preferencias del usuario: ${usuario.preferencias.join(', ')}`
        : '';

      const objetivo = usuario?.objetivo_fisico
        ? `Objetivo físico: ${usuario.objetivo_fisico}`
        : '';

      let configPreferencias = '';
      if (usuario?.configuracion) {
        try {
          const config = (
            typeof usuario.configuracion === 'string'
              ? JSON.parse(usuario.configuracion)
              : usuario.configuracion
          ) as {
            dificultad?: string;
            estilosComida?: string[];
            equipamiento?: string[];
          } | null;

          if (config) {
            const prepDificultad =
              config.dificultad === 'rapido'
                ? 'Dificultad y tiempo: Recetas obligatoriamente de dificultad "fácil" y tiempo_minutos <= 30 minutos.'
                : 'Dificultad y tiempo: Recetas de cualquier nivel de dificultad (fácil, media o difícil) sin límite de tiempo.';

            const estilos = config.estilosComida?.length
              ? `Estilos de cocina favoritos: ${config.estilosComida.join(', ')}`
              : '';

            const equipos = config.equipamiento?.length
              ? `Equipamiento de cocina disponible: ${config.equipamiento.join(', ')}`
              : '';

            configPreferencias = [prepDificultad, estilos, equipos]
              .filter(Boolean)
              .join('\n');
          }
        } catch (e) {
          console.error(
            '[UC_RecomendarRecetas] Error parsing configuracion:',
            e,
          );
        }
      }

      const contexto = [
        preferencias,
        objetivo,
        configPreferencias,
        ...restricciones,
      ]
        .filter(Boolean)
        .join('\n');

      // ── 4. Llamar a Gemini ────────────────────────────────────────────────
      const gemini = GeminiService.instance;
      if (!gemini) return SendResponse.error('Servicio de IA no disponible');

      const prompt = `
Eres un chef y nutricionista experto integrado en TinyFood, una app de gestión de despensa.

El usuario tiene estos ingredientes disponibles en su despensa (ordenados por urgencia de vencimiento):
${listaIngredientes}

${contexto ? `Contexto importante del usuario:\n${contexto}` : ''}

Genera exactamente ${cantidad} recetas deliciosas y prácticas usando principalmente los ingredientes disponibles.
Prioriza los ingredientes que aparecen primero en la lista (próximos a vencer).

REGLAS OBLIGATORIAS DE COMPOSICIÓN:
1. Coherencia de ingredientes: No intentes usar todos los ingredientes en una sola receta. Genera platos con sentido culinario y lógico (por ejemplo, si hay carne y arándanos, haz un plato con la carne, NO le agregues arándanos).
2. Sin combinaciones absurdas: Prohibido mezclar frutas de sabor dulce (fresas, arándanos, etc.) en platos salados tradicionales con pollo, carne o pescado (como "ají de gallina con arándanos").
3. Seguridad alimentaria: Bajo ninguna circunstancia sugieras aves o carnes crudas o marinadas en frío (está terminantemente prohibido el "ceviche de pollo").
4. Si la receta necesita ingredientes comunes que el usuario no tiene en la despensa (como aceite, sal, cebolla o arroz), lístalos bajo "ingredientes_extra".
5. Nombres reales y tradicionales: Las recetas deben tener nombres de platos reales, conocidos y apetitosos del mundo real (por ejemplo, "Crumble de fresas y arándanos" en lugar de "arándanos al horno con fresas", o "Guiso de carne molida" o "Hamburguesas caseras" en lugar de "carne molida al estilo chino"). Evita nombres descriptivos o artificiales del tipo "[Ingrediente A] con [Ingrediente B]".
6. Platos dulces vs salados: Si usas frutas dulces (como fresas, arándanos o plátanos), utilízalas únicamente para preparar recetas dulces lógicas (postres, desayunos, batidos, repostería o ensaladas de frutas).
Devuelve ÚNICAMENTE este objeto JSON (sin texto adicional, sin markdown):
{
  "recetas": [
    {
      "nombre": "nombre de la receta",
      "descripcion": "descripción breve y apetitosa de 1-2 oraciones",
      "tiempo_minutos": número entero,
      "dificultad": "fácil | media | difícil",
      "porciones": número entero,
      "ingredientes_usados": ["ingrediente1 de la despensa", "ingrediente2"],
      "ingredientes_extra": ["ingrediente que no tiene pero podría necesitar"],
      "pasos": ["Paso 1: ...", "Paso 2: ...", "Paso 3: ..."],
      "calorias_aprox": número entero estimado por porción,
      "emoji": "emoji representativo de la receta"
    }
  ]
}
      `.trim();

      const resultado = await gemini.generate<GeminiRespuestaRecetas>(prompt);

      if (!resultado.recetas?.length) {
        return SendResponse.error(
          'No se pudieron generar recetas. Intenta nuevamente.',
        );
      }

      return SendResponse.success(
        {
          recetas: resultado.recetas,
          total: resultado.recetas.length,
          ingredientes_usados: disponibles.length,
        },
        `${resultado.recetas.length} recetas generadas con tu despensa`,
      );
    } catch (error) {
      console.error('[UC_RecomendarRecetas] Error:', error);
      return SendResponse.error(
        'Error al generar recetas. Intenta nuevamente.',
      );
    }
  }
}
