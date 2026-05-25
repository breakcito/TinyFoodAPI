import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { UserData } from '../data/usuario.data';
import { SupabaseStorageService } from '../../../common/service/supabase-storage.service';
import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';
import { IUser } from '../../../common/presentation/interfaces/usuario.interface';

interface Condicion {
  nombre: string;
  descripcion: string;
}

export class UC_ActualizarPerfil {
  static async execute(
    usuario: IUser,
    data: {
      nombre?: string;
      foto_b64?: string | null;
      peso?: number;
      talla?: number;
      nivel_actividad?: number;
      genero?: Genero;
      informacion_medica?: Condicion[];
      alimentos_prohibidos?: string[];
      preferencias?: string[];
      fecha_nacimiento?: string;
      objetivo_fisico?: ObjetivoFisico;
      configuracion?: Record<string, any>;
    },
  ): Promise<ApiResponse> {
    try {
      // Procesar la foto de perfil en el storage de Supabase
      let url_foto: string | null | undefined = undefined;

      if (data.foto_b64 === null) {
        // Eliminar foto anterior si existía
        if (usuario.url_foto) {
          await SupabaseStorageService.eliminarArchivo(usuario.url_foto);
        }
        url_foto = null;
      } else if (data.foto_b64) {
        // Es base64 directo, lo subimos
        url_foto = await SupabaseStorageService.actualizarArchivo(
          usuario.url_foto,
          {
            base64: data.foto_b64,
          },
        );
      }

      // Convertir fecha string a Date para Prisma
      const fecha_nacimiento = data.fecha_nacimiento
        ? new Date(data.fecha_nacimiento)
        : undefined;

      const usuarioActualizado = await UserData.actualizarPerfil(usuario.id, {
        nombre: data.nombre,
        url_foto,
        peso: data.peso,
        talla: data.talla,
        fecha_nacimiento,
        genero: data.genero,
        nivel_actividad: data.nivel_actividad,
        informacion_medica: data.informacion_medica,
        alimentos_prohibidos: data.alimentos_prohibidos,
        preferencias: data.preferencias,
        objetivo_fisico: data.objetivo_fisico,
        configuracion: data.configuracion,
      });

      return SendResponse.success(
        usuarioActualizado,
        'Perfil actualizado con éxito',
      );
    } catch (error) {
      console.error('[UC_ActualizarPerfil] Error:', error);
      return SendResponse.error('Error al actualizar el perfil');
    }
  }
}
