import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EstadoComida } from 'src/common/utils/enums/estado-comida.enum';

export class REQ_ActualizarComida {
  @IsInt()
  @IsNotEmpty()
  id!: number;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  cantidad?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsDateString()
  @IsOptional()
  fecha_vencimiento?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(EstadoComida)
  @IsOptional()
  estado?: EstadoComida;
}
