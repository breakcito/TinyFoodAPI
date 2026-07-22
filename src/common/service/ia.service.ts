/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { getDataUrlFromB64 } from '../utils/functions/get-data-url-from-b64';

// Servicio de IA centralizado con autodetección de modelos de Groq y resiliencia.
@Injectable()
export class IAService implements OnModuleInit {
  static instance: IAService;
  private groq: Groq;
  private modelText: string;
  private modelVision: string;
  private modelStructured: string;
  private activeModelsCache: string[] = [];

  constructor(private configService: ConfigService) {
    IAService.instance = this;

    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      console.warn(
        '[IAService] GROQ_API_KEY no encontrada. Agrégala en el .env',
      );
    }
    this.groq = new Groq({ apiKey: apiKey || '' });

    // Cargar modelos iniciales de variables de entorno con fallbacks seguros
    this.modelText =
      this.configService.get<string>('GROQ_MODEL_TEXT') ||
      'openai/gpt-oss-120b';
    this.modelVision =
      this.configService.get<string>('GROQ_MODEL_VISION') || 'qwen/qwen3.6-27b';
    this.modelStructured =
      this.configService.get<string>('GROQ_MODEL_STRUCTURED') || this.modelText;
  }

  async onModuleInit() {
    await this.syncActiveModels();
  }

  /**
   * Sincroniza dinámicamente la lista de modelos activos ofrecidos por Groq
   * para evitar fallos si Groq cambia o retira modelos sin previo aviso.
   */
  private async syncActiveModels(): Promise<void> {
    try {
      const modelsList = await this.groq.models.list();
      this.activeModelsCache = modelsList.data
        .filter((m: any) => m.active !== false)
        .map((m) => m.id);

      console.log(
        `[IAService] Modelos activos en Groq (${this.activeModelsCache.length}):`,
        this.activeModelsCache,
      );

      // Prioridades de fallbacks para texto / estructurado
      const preferredText = [
        this.configService.get<string>('GROQ_MODEL_TEXT'),
        'openai/gpt-oss-120b',
        'llama-3.3-70b-versatile',
        'llama-3.1-8b-instant',
        'openai/gpt-oss-20b',
      ].filter(Boolean) as string[];

      const activeText = preferredText.find((m) =>
        this.activeModelsCache.includes(m),
      );
      if (activeText) {
        this.modelText = activeText;
        this.modelStructured = activeText;
      }

      // Prioridades de fallbacks para visión
      const preferredVision = [
        this.configService.get<string>('GROQ_MODEL_VISION'),
        'qwen/qwen3.6-27b',
      ].filter(Boolean) as string[];

      const activeVision = preferredVision.find((m) =>
        this.activeModelsCache.includes(m),
      );
      if (activeVision) {
        this.modelVision = activeVision;
      }

      console.log(
        `[IAService] Modelos seleccionados -> Texto/Estructurado: ${this.modelText} | Visión: ${this.modelVision}`,
      );
    } catch (error) {
      console.warn(
        '[IAService] No se pudo sincronizar la lista de modelos de Groq, usando valores predeterminados:',
        error,
      );
    }
  }

  /**
   * Método genérico privado para interactuar con Groq, con tolerancia a fallos
   * y fallback automático de json_schema a json_object si el modelo no soporta json_schema.
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

    let currentMessages = JSON.parse(JSON.stringify(messages));
    let responseFormat: any = schema
      ? {
          type: 'json_schema' as const,
          json_schema: {
            name: schemaName,
            schema,
          },
        }
      : { type: 'json_object' as const };

    try {
      const completion = await this.instance.groq.chat.completions.create({
        model,
        messages: currentMessages,
        temperature,
        response_format: responseFormat,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw) as T;
    } catch (error: any) {
      const errMsg = String(error?.message || error || '');

      // Detectar si el modelo no soporta `json_schema` y reintentar automáticamente con `json_object`
      if (
        schema &&
        responseFormat.type === 'json_schema' &&
        (errMsg.includes('json_schema') || error?.status === 400)
      ) {
        console.warn(
          `[IAService] El modelo '${model}' no soporta 'json_schema'. Aplicando fallback automático a 'json_object'...`,
        );

        responseFormat = { type: 'json_object' as const };

        // Inyectar el esquema esperado dentro del prompt del último mensaje para garantizar la estructura
        const schemaPrompt = `\n\n[REGLA DE FORMATO OBLIGATORIA]: Responde ÚNICAMENTE en formato JSON válido que cumpla estrictamente con la siguiente estructura de esquema:\n${JSON.stringify(schema, null, 2)}`;

        const lastIndex = currentMessages.length - 1;
        const lastMsg = currentMessages[lastIndex];

        if (typeof lastMsg.content === 'string') {
          currentMessages[lastIndex] = {
            ...lastMsg,
            content: lastMsg.content + schemaPrompt,
          };
        } else if (Array.isArray(lastMsg.content)) {
          currentMessages[lastIndex] = {
            ...lastMsg,
            content: lastMsg.content.map((c: any) =>
              c.type === 'text' ? { ...c, text: c.text + schemaPrompt } : c,
            ),
          };
        }

        try {
          const completionFallback =
            await this.instance.groq.chat.completions.create({
              model,
              messages: currentMessages,
              temperature,
              response_format: responseFormat,
            });

          const rawFallback =
            completionFallback.choices[0]?.message?.content ?? '{}';
          return JSON.parse(rawFallback) as T;
        } catch (fallbackError) {
          console.error(
            '[IAService] Error durante el fallback a json_object:',
            fallbackError,
          );
          throw new Error('Error al procesar la solicitud con la IA.');
        }
      }

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
