import { getMimeType } from './get-mime-type';

/**
 * Convierte un string base64 a formato Data URL (con esquema data:mime/type;base64,...).
 * Si ya lo incluye, lo retorna tal cual.
 */
export async function getDataUrlFromB64(b64: string): Promise<string> {
  if (b64.startsWith('data:')) {
    return b64;
  }
  const [mime] = await getMimeType(b64);
  return `data:${mime};base64,${b64}`;
}
