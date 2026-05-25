// Servicio de IA centralizado. Usa Groq como proveedor (gratis, sin tarjeta).

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

// Modelo para texto puro
const MODEL_TEXT = 'llama-3.3-70b-versatile';
// Modelo para imágenes (vision)
const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';
export interface FoodItem {
  name: string;
  category: string;
  quantity: string;
}

@Injectable()
export class GeminiService {
  static instance: GeminiService;
  private groq: Groq;

  constructor(private configService: ConfigService) {
    GeminiService.instance = this;

    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      console.warn('[GeminiService] GROQ_API_KEY no encontrada. Agrégala en el .env');
    }
    this.groq = new Groq({ apiKey: apiKey || '' });
  }

  async generate<T>(prompt: string): Promise<T> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: MODEL_TEXT,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente que responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin bloques de código.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      return this.parseResponse<T>(raw);
    } catch (error) {
      console.error('[GeminiService] Error en generate():', error);
      throw new Error('Error al procesar la solicitud con IA.');
    }
  }

  // ─── Método genérico: imagen + texto ──────────────────────────────────────

  async generateFromImage<T>(
    foto_b64: string,
    mimeType: string = 'image/jpeg',
    prompt: string,
  ): Promise<T> {
    try {
      // Limpiar prefijo data:image/...;base64, si viene incluido
      const base64Clean = foto_b64.includes(',')
        ? foto_b64.split(',')[1]
        : foto_b64;

      const dataUrl = `data:${mimeType};base64,${base64Clean}`;

      const completion = await this.groq.chat.completions.create({
        model: MODEL_VISION,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente que responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin bloques de código.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      return this.parseResponse<T>(raw);
    } catch (error) {
      console.error('[GeminiService] Error en generateFromImage():', error);
      throw new Error('No pudimos procesar la imagen con IA.');
    }
  }

  async analyzeFoodImage(imageBase64: string): Promise<FoodItem[]> {
    try {
      const result = await this.generateFromImage<{ items: FoodItem[] }>(
        imageBase64,
        'image/jpeg',
        `Analiza esta imagen e identifica todos los alimentos posibles.
Para cada uno indica nombre, categoría (fruta, vegetal, envasado, carne, etc) y cantidad estimada.
Devuelve: { "items": [{ "name": "", "category": "", "quantity": "" }] }`,
      );
      return result.items ?? [];
    } catch (error) {
      console.error('[GeminiService] Error en analyzeFoodImage():', error);
      throw new Error('No pudimos procesar la imagen con IA.');
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
      throw new Error('La IA devolvió una respuesta en formato inesperado.');
    }
  }
}