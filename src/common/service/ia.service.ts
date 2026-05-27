/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { getDataUrlFromB64 } from '../utils/functions/get-data-url-from-b64';

// Servicio de IA centralizado. Usa Groq como proveedor (gratis, sin tarjeta).
@Injectable()
export class IAService {
  static instance: IAService;
  private groq: Groq;
  private modelText: string;
  private modelVision: string;
  private modelStructured: string;

  constructor(private configService: ConfigService) {
    IAService.instance = this;

    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      console.warn(
        '[IAService] GROQ_API_KEY no encontrada. Agrégala en el .env',
      );
    }
    this.groq = new Groq({ apiKey: apiKey || '' });

    // Cargar modelos de variables de entorno con defaults seguros
    this.modelText =
      this.configService.get<string>('GROQ_MODEL_TEXT') ||
      'llama-3.3-70b-versatile';
    this.modelVision =
      this.configService.get<string>('GROQ_MODEL_VISION') ||
      'meta-llama/llama-4-scout-17b-16e-instruct';
    // Único modelo gratuito de Groq que soporta json_schema (structured outputs)
    this.modelStructured =
      this.configService.get<string>('GROQ_MODEL_STRUCTURED') ||
      'meta-llama/llama-4-scout-17b-16e-instruct';
  }

  /**
   * Método genérico privado para interactuar con Groq y validar salidas estructuradas
   */
  private static async requestGroq<T>({
    model,
    messages,
    schema,
    schemaName = 'response_schema',
    temperature = 0.4,
  }: {
    model: string;
    messages: any[];
    schema?: any;
    schemaName?: string;
    temperature?: number;
  }): Promise<T> {
    if (!this.instance) {
      throw new Error('[IAService] Instancia no inicializada');
    }
    try {
      const responseFormat = schema
        ? {
            type: 'json_schema' as const,
            json_schema: {
              name: schemaName,
              schema,
            },
          }
        : { type: 'json_object' as const };

      const completion = await this.instance.groq.chat.completions.create({
        model,
        messages,
        temperature,
        response_format: responseFormat,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error('[IAService] Error en requestGroq:', error);
      throw new Error('Error al procesar la solicitud con la IA.');
    }
  }

  static async generate<T>(
    prompt: string,
    schema?: any,
    schemaName?: string,
  ): Promise<T> {
    if (!this.instance) {
      throw new Error('[IAService] Instancia no inicializada');
    }
    // Si se pasa schema, usar el modelo que soporta json_schema
    const model = schema
      ? this.instance.modelStructured
      : this.instance.modelText;

    return this.requestGroq<T>({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      schema,
      schemaName,
      temperature: 0.7,
    });
  }

  static async analyzeImage<T>(
    foto_b64: string,
    prompt: string,
    schema?: any,
    schemaName?: string,
  ): Promise<T> {
    if (!this.instance) {
      throw new Error('[IAService] Instancia no inicializada');
    }
    const dataUrl = await getDataUrlFromB64(foto_b64);

    return this.requestGroq<T>({
      model: this.instance.modelVision,
      messages: [
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
      schema,
      schemaName,
      temperature: 0.4,
    });
  }
}
