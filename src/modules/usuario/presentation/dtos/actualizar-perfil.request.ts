import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';

class CondicionMedicaDto {
  @IsString()
  nombre: string = '';

  @IsString()
  descripcion: string = '';
}

export class REQ_ActualizarPerfil {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  foto_b64?: string | null;

  @IsDateString()
  @IsOptional()
  fecha_nacimiento?: string;

  @IsEnum(Genero)
  @IsOptional()
  genero?: Genero;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  peso?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(300)
  talla?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  nivel_actividad?: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CondicionMedicaDto)
  informacion_medica?: CondicionMedicaDto[];

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
