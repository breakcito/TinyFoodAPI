/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';
import { PrismaService } from '../../../common/service/prisma.service';

interface Condicion {
  nombre: string;
  descripcion: string;
}
export class UserData {
  /** Buscar usuario por su ID interno de la BD */
  static async findById(id: number) {
    return PrismaService.db.usuario.findUnique({
      where: { id },
    });
  }

  /** Actualizar los datos editables del perfil */
  static async actualizarPerfil(
    id: number,
    payload: {
      nombre?: string;
      url_foto?: string | null;
      peso?: number;
      talla?: number;
      fecha_nacimiento?: Date;
      genero?: Genero;
      nivel_actividad?: number;
      informacion_medica?: Condicion[];
      alimentos_prohibidos?: string[];
      preferencias?: string[];
      objetivo_fisico?: ObjetivoFisico;
      configuracion?: Record<string, any>;
    },
  ) {
    return PrismaService.db.usuario.update({
      where: { id },
      data: {
        ...payload,
        informacion_medica: payload.informacion_medica as any,
      },
    });
  }
}
