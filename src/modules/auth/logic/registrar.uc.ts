import { AuthData } from '../data/auth.data';
import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { Genero } from 'src/common/utils/enums/genero';
import { ObjetivoFisico } from 'src/common/utils/enums/objetivo-fisico.enum';
import { SupabaseStorageService } from '../../../common/service/supabase-storage.service';

/**
 * Registra al usuario con la información personal solicitada.
 */
export class UC_Registrar {
  static async execute(data: {
    id_supabase: string; // id de la tabla "users" de supabase
    nombre: string;
    url_foto?: string;
    foto_b64?: string;
    genero: Genero;
    peso?: number;
    talla?: number;
    fecha_nacimiento?: string; // Llega como string desde el front
    nivel_actividad?: number;
    informacion_medica?: { nombre: string; descripcion?: string }[]; // Recibe el JSON array validado
    alimentos_prohibidos?: string[];
    preferencias?: string[];
    objetivo_fisico?: ObjetivoFisico;
  }): Promise<ApiResponse> {
    try {
      // Verificación de seguridad usando id_supabase
      const existe = await AuthData.findUserBySupabaseId(data.id_supabase);
      if (existe) {
        return SendResponse.error('USER_ALREADY_EXISTS');
      }

      const { foto_b64, url_foto, ...resto } = data;
      let final_url_foto = url_foto;

      if (foto_b64) {
        final_url_foto = await SupabaseStorageService.subirArchivo({
          base64: foto_b64,
        });
      }

      const nuevoUsuario = await AuthData.crearUsuario({
        ...resto,
        url_foto: final_url_foto,
        fecha_nacimiento: data.fecha_nacimiento
          ? new Date(data.fecha_nacimiento)
          : undefined,
      });

      return SendResponse.success(
        nuevoUsuario,
        'Registro completado con éxito',
      );
    } catch (error) {
      return SendResponse.error(
        `Error al registrar usuario: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      );
    }
  }
}
