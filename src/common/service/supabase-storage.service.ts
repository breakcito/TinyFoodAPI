/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { MimeTypeEnum } from '../utils/enums/mime-type';
import { getMimeType } from '../utils/functions/get-mime-type';

@Injectable()
export class SupabaseStorageService {
  static instance: SupabaseStorageService;
  private supabase: any;

  private static readonly BUCKET_ALLOWED_TYPES: MimeTypeEnum[] = [
    MimeTypeEnum.JPEG,
    MimeTypeEnum.PNG,
    MimeTypeEnum.WEBP,
    MimeTypeEnum.AVIF,
  ];

  constructor(private readonly configService: ConfigService) {
    SupabaseStorageService.instance = this;
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn(
        '[SupabaseStorageService] Credenciales de Supabase no completas en .env',
      );
    }

    this.supabase = createClient(supabaseUrl || '', supabaseServiceKey || '');
  }

  static async subirArchivos(
    files: Array<{ base64: string; name?: string }>,
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string[]> {
    if (!this.instance) {
      throw new Error('[SupabaseStorageService] Instancia no inicializada');
    }
    return this.instance.subirArchivos(files, allowedTypes);
  }

  static async subirArchivo(
    file: { base64: string; name?: string },
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string> {
    if (!this.instance) {
      throw new Error('[SupabaseStorageService] Instancia no inicializada');
    }
    return this.instance.subirArchivo(file, allowedTypes);
  }

  static async eliminarArchivo(url: string): Promise<void> {
    if (!this.instance) {
      throw new Error('[SupabaseStorageService] Instancia no inicializada');
    }
    return this.instance.eliminarArchivo(url);
  }

  static async actualizarArchivo(
    oldUrl: string | null | undefined,
    file: { base64: string; name?: string },
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string> {
    if (!this.instance) {
      throw new Error('[SupabaseStorageService] Instancia no inicializada');
    }
    return this.instance.actualizarArchivo(oldUrl, file, allowedTypes);
  }

  /**
   * Sube una lista de archivos al bucket "TinyBucket"
   */
  async subirArchivos(
    files: Array<{ base64: string; name?: string }>,
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const url = await this.subirArchivo(file, allowedTypes);
      urls.push(url);
    }
    return urls;
  }

  /**
   * Sube un único archivo en base64 al bucket "TinyBucket"
   */
  async subirArchivo(
    file: { base64: string; name?: string },
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string> {
    try {
      const [mimeType, ext] = await getMimeType(file.base64);

      // Validar contra los tipos permitidos globales del bucket
      const isGlobalAllowed =
        SupabaseStorageService.BUCKET_ALLOWED_TYPES.includes(
          mimeType as MimeTypeEnum,
        );
      if (!isGlobalAllowed) {
        throw new Error(
          `Tipo de archivo no permitido por el bucket: ${mimeType}`,
        );
      }

      // Validar contra los tipos permitidos específicos solicitados por el llamador
      if (allowedTypes && !allowedTypes.includes(mimeType as MimeTypeEnum)) {
        throw new Error(
          `Tipo de archivo no permitido para esta operación: ${mimeType}. Permitidos: ${allowedTypes.join(', ')}`,
        );
      }

      // Decodificar base64
      const base64Data = file.base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const fileName = file.name || `${crypto.randomUUID()}.${ext}`;
      const uniqueName = fileName.includes('/')
        ? fileName
        : `profiles/${fileName}`;

      const { error } = await this.supabase.storage
        .from('TinyBucket')
        .upload(uniqueName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.error(
          '[SupabaseStorageService] Error subiendo archivo:',
          error,
        );
        throw new Error(`Error subiendo archivo: ${error.message}`);
      }

      // Obtener la URL pública del archivo subido
      const { data: publicUrlData } = this.supabase.storage
        .from('TinyBucket')
        .getPublicUrl(uniqueName);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error(
        '[SupabaseStorageService] Fallo crítico al subir archivo:',
        error,
      );
      throw error;
    }
  }

  /**
   * Elimina un archivo del bucket dada su URL pública
   */
  async eliminarArchivo(url: string): Promise<void> {
    try {
      const path = this.extractPathFromUrl(url);
      if (!path) return;

      const { error } = await this.supabase.storage
        .from('TinyBucket')
        .remove([path]);

      if (error) {
        console.error(
          `[SupabaseStorageService] Error eliminando archivo en ruta ${path}:`,
          error,
        );
      } else {
        console.log(
          `[SupabaseStorageService] Archivo eliminado con éxito: ${path}`,
        );
      }
    } catch (error) {
      console.error(
        '[SupabaseStorageService] Fallo eliminando archivo:',
        error,
      );
    }
  }

  /**
   * Actualiza un archivo: elimina el antiguo si existe y sube el nuevo
   */
  async actualizarArchivo(
    oldUrl: string | null | undefined,
    file: { base64: string; name?: string },
    allowedTypes?: MimeTypeEnum[],
  ): Promise<string> {
    if (oldUrl) {
      await this.eliminarArchivo(oldUrl);
    }
    return this.subirArchivo(file, allowedTypes);
  }

  /**
   * Extrae el path de almacenamiento a partir de la URL pública de Supabase
   */
  private extractPathFromUrl(url: string): string | null {
    const marker = '/storage/v1/object/public/TinyBucket/';
    const index = url.indexOf(marker);
    if (index !== -1) {
      return url.substring(index + marker.length);
    }
    return null;
  }
}
