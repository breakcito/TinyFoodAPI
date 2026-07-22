import { fromBuffer } from 'file-type';

/**
 * Detecta el mimetype a partir de un string base64.
 * Primero intenta extraerlo del Data URI scheme.
 * Si no tiene cabecera, inspecciona los magic bytes usando la librería "file-type".
 */
export async function getMimeType(base64: string): Promise<[string, string]> {
  // 1. Intentar obtener de la cabecera data URI
  const match = base64.match(/^data:([^;]+);base64,/);
  if (match) {
    const mime = match[1];
    let ext = mime.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    return [mime, ext];
  }

  // 2. Si no tiene cabecera, decodificar a Buffer y detectar con file-type
  const base64Clean = base64
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s+/g, '');
  const buffer = Buffer.from(base64Clean, 'base64');

  try {
    const result = await fromBuffer(buffer);
    if (result && result.mime.startsWith('image/')) {
      return [result.mime, result.ext];
    }
  } catch {
    // Ignorar error de detección y usar fallback de imagen
  }

  return ['image/jpeg', 'jpg'];
}
