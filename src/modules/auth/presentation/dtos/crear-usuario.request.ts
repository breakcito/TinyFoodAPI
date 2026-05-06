import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InfoMedicaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class REQ_CrearUsuario {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsNumber()
  @IsOptional()
  peso?: number;

  @IsNumber()
  @IsOptional()
  talla?: number;

  @IsNumber()
  @IsOptional()
  nivel_actividad?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InfoMedicaDto)
  @IsOptional()
  informacion_medica?: InfoMedicaDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alimentos_prohibidos?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferencias?: string[];
}

// Estos datos no los envia el front, pero son insertados desde el backend
export class REQ_CrearUsuarioExtended extends REQ_CrearUsuario {
  @IsString()
  @IsNotEmpty()
  id_supabase: string;

  @IsUrl()
  @IsOptional()
  urlFoto?: string;
}
