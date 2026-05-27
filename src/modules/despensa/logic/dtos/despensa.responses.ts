import { EstadoComida } from 'src/common/utils/enums/estado-comida.enum';

export interface RES_Comida {
  id: number;
  id_usuario: number;
  nombre: string;
  cantidad: string;
  descripcion: string | null;
  fecha_vencimiento: Date | null;
  tags: string[];
  created_at: Date;
  estado: EstadoComida;
}
