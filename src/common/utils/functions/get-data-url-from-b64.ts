import { getMimeType } from './get-mime-type';

/**
 * Convierte un string base64 a formato Data URL (con esquema data:mime/type;base64,...).
 * Si ya lo incluye, lo retorna tal cual.
 */
export async function getDataUrlFromB64(b64: string): Promise<string> {
  const cleaned = b64.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('data:')) {
    return cleaned;
  }
  const [mime] = await getMimeType(cleaned);
  return `data:${mime};base64,${cleaned}`;
}
