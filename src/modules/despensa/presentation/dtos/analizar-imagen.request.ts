import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
 
export class REQ_AnalizarImagen {
  @IsString()
  @IsNotEmpty()
  foto_b64!: string; 
 
  @IsString()
  @IsOptional()
  mime_type?: string; // Por defecto 'image/jpeg'
}