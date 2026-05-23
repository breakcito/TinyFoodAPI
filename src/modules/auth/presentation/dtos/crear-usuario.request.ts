import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';

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

  @IsString()
  @IsOptional()
  foto_b64?: string;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsEnum(Genero)
  @IsNotEmpty()
  genero: Genero;

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

  @IsEnum(ObjetivoFisico)
  @IsOptional()
  objetivo_fisico?: ObjetivoFisico;
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
