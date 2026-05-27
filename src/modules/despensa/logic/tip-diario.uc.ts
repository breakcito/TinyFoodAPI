import { IAService } from '../../../common/service/ia.service';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { UC_BuildIAContext } from './build-ia-context.uc';

interface RES_TipDiario {
  titulo: string;
  consejo: string;
  urgencia: 'alta' | 'media' | 'baja';
  emoji: string;
}

export class UC_TipDiario {
  static async execute(
    id_usuario: number,
    dias_caducidad: number = 5,
  ): Promise<ApiResponse> {
    try {
      const { contextoUsuario, comidas } =
        await UC_BuildIAContext.execute(id_usuario);

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const enLimiteDias = new Date(hoy);
      enLimiteDias.setDate(enLimiteDias.getDate() + dias_caducidad);

      const proximosAVencer = comidas.todas.filter((c) => {
        if (!c.fecha_vencimiento || c.estado !== 'Por consumir') return false;
        const vence = new Date(c.fecha_vencimiento);
        vence.setHours(0, 0, 0, 0);
        return vence >= hoy && vence <= enLimiteDias;
      });

      const contextoBloque = contextoUsuario
        ? `Contexto del usuario:\n${contextoUsuario}`
        : '';

      let prompt = '';

      if (proximosAVencer.length > 0) {
        // Hay alimentos próximos a vencer — tip de urgencia
        const listaUrgente = proximosAVencer
          .map((c) => {
            const vence = new Date(c.fecha_vencimiento!);
            const dias = Math.ceil(
              (vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
            );
            return `- ${c.nombre} (${c.cantidad}) — vence en ${dias} día(s)`;
          })
          .join('\n');

        prompt = `
Eres un asistente nutricional amigable de TinyFood.

El usuario tiene estos alimentos PRÓXIMOS A VENCER:
${listaUrgente}

${contextoBloque}

Genera un consejo breve, práctico y motivador para usar esos alimentos antes de que se malogren.
Sé específico con el alimento más urgente.

Devuelve ÚNICAMENTE este JSON:
{
  "titulo": "título corto llamativo máximo 5 palabras",
  "consejo": "consejo práctico de 1-2 oraciones específico al alimento más urgente",
  "urgencia": "alta | media | baja",
  "emoji": "emoji del alimento más urgente"
}`.trim();
      } else if (comidas.disponibles.length > 0) {
        // Hay alimentos pero ninguno urgente — tip de buenas prácticas
        const listaDisponibles = comidas.disponibles
          .slice(0, 5)
          .map((c) => `- ${c.nombre} (${c.cantidad})`)
          .join('\n');

        prompt = `
Eres un asistente nutricional amigable de TinyFood.

El usuario tiene estos alimentos en su despensa:
${listaDisponibles}

${contextoBloque}

Genera un consejo útil del día sobre cómo aprovechar mejor esos alimentos,
una combinación saludable, o un tip de cocina/nutrición relacionado.

Devuelve ÚNICAMENTE este JSON:
{
  "titulo": "título corto llamativo máximo 5 palabras",
  "consejo": "consejo útil de 1-2 oraciones",
  "urgencia": "baja",
  "emoji": "emoji relevante"
}`.trim();
      } else {
        // Despensa vacía — tip para motivar a llenar la despensa
        prompt = `
Eres un asistente nutricional amigable de TinyFood.

El usuario tiene la despensa vacía.
${contextoBloque}

Genera un consejo motivador y útil sobre qué alimentos saludables debería comprar
o cómo organizar mejor su despensa.

Devuelve ÚNICAMENTE este JSON:
{
  "titulo": "título corto motivador máximo 5 palabras",
  "consejo": "consejo útil de 1-2 oraciones sobre qué comprar o cómo organizarse",
  "urgencia": "baja",
  "emoji": "emoji motivador relacionado a comida"
}`.trim();
      }

      const resultado = await IAService.generate<RES_TipDiario>(prompt);

      return SendResponse.success(
        {
          titulo: resultado.titulo,
          consejo: resultado.consejo,
          urgencia: resultado.urgencia,
          emoji: resultado.emoji,
          hay_tip: true,
          alimentos_proximos: proximosAVencer.length,
        },
        'Tip diario generado',
      );
    } catch (error) {
      console.error('[UC_TipDiario] Error:', error);
      return SendResponse.error('Error al generar el tip diario');
    }
  }
}
