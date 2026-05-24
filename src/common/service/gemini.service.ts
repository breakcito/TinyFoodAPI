// Servicio centralizado de Gemini. Compatible con la inyección de dependencias de NestJS. Todos los casos de uso acceden vía GeminiService.instance.

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Part, Type } from '@google/genai';

const MODEL = 'gemini-2.0-flash';

// ── Tipos legacy (se mantienen para no romper código existente) ───────────────
export interface FoodItem {
  name: string;
  category: string;
  quantity: string;
}

@Injectable()
export class GeminiService {
  /** Instancia estática para acceso desde casos de uso sin inyección */
  static instance: GeminiService;

  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    GeminiService.instance = this;

    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn(
        '[GeminiService] GEMINI_API_KEY no encontrada. Agrégala en el .env',
      );
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  // ─── Método genérico: solo texto ──────────────────────────────────────────

  /**
   * Genera una respuesta JSON estructurada a partir de un prompt de texto.
   *
   * @param prompt - Instrucción completa (debe describir el schema esperado).
   * @returns      - Objeto tipado T.
   */
  async generate<T>(prompt: string): Promise<T> {
    try {
      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        },
      });

      return this.parseResponse<T>(response.text ?? '');
    } catch (error) {
      console.error('[GeminiService] Error en generate():', error);
      throw new InternalServerErrorException(
        'Error al procesar la solicitud con IA.',
      );
    }
  }

  // ─── Método genérico: imagen + texto ──────────────────────────────────────

  /**
   * Genera una respuesta JSON estructurada a partir de una imagen (base64)
   * más un prompt descriptivo.
   *
   * @param foto_b64  - Imagen en base64 (con o sin prefijo data:image/...).
   * @param mimeType  - Tipo MIME de la imagen. Default: 'image/jpeg'.
   * @param prompt    - Instrucción para Gemini sobre qué analizar.
   * @returns         - Objeto tipado T.
   */
  async generateFromImage<T>(
    foto_b64: string,
    mimeType: string = 'image/jpeg',
    prompt: string,
  ): Promise<T> {
     console.log('[GeminiService] API Key (primeros 30 chars):', 
    this.ai['apiKey']?.substring(0, 30) ?? 'NO KEY');
    try {
      const base64Clean = foto_b64.includes(',')
        ? foto_b64.split(',')[1]
        : foto_b64;

      const parts: Part[] = [
        {
          inlineData: {
            mimeType,
            data: base64Clean,
          },
        },
        { text: prompt },
      ];

      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
        },
      });

      return this.parseResponse<T>(response.text ?? '');
    } catch (error) {
      console.error('[GeminiService] Error en generateFromImage():', error);
      throw new InternalServerErrorException(
        'No pudimos procesar la imagen con IA.',
      );
    }
  }

  // ─── Método legacy (mantenido para compatibilidad) ────────────────────────

  /** @deprecated Usa generateFromImage<T>() en su lugar. */
  async analyzeFoodImage(imageBase64: string): Promise<FoodItem[]> {
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await this.ai.models.generateContent({
        model: MODEL,
        contents: [
          'Analiza esta imagen e identifica todos los alimentos posibles. Para cada uno, indica el nombre, categoría (fruta, vegetal, envasado, carne, etc) y una estimación de cantidad. Devuelve estrictamente el JSON esperado.',
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                quantity: { type: Type.STRING },
              },
            },
          },
        },
      });

      const responseText = response.text || '[]';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return JSON.parse(responseText);
    } catch (error) {
      console.error('[GeminiService] Error en analyzeFoodImage():', error);
      throw new InternalServerErrorException(
        'No pudimos procesar la imagen con IA.',
      );
    }
  }

  // ─── Utilidad privada ─────────────────────────────────────────────────────

  private parseResponse<T>(raw: string): T {
    try {
      const clean = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      return JSON.parse(clean) as T;
    } catch {
      console.error('[GeminiService] Error al parsear respuesta:', raw);
      throw new InternalServerErrorException(
        'La IA devolvió una respuesta en formato inesperado.',
      );
    }
  }
}