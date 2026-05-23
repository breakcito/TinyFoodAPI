import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';

export interface IUser {
  id: number;
  id_supabase: string;
  nombre: string;
  fecha_nacimiento?: Date | null;
  genero: Genero;
  url_foto?: string | null;
  peso?: number | null;
  talla?: number | null;
  nivel_actividad?: number | null;
  informacion_medica?: string | null;
  alimentos_prohibidos: string[];
  preferencias: string[];
  objetivo_fisico: ObjetivoFisico;
  created_at: Date;
}
