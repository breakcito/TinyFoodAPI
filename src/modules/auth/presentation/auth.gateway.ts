import { AuthSocket } from 'src/common/presentation/interfaces/auth-socket.interface';
import { UC_Autenticar } from '../logic/autenticar.uc';
import { UC_Registrar } from '../logic/registrar.uc';
import { Dispatcher } from 'src/common/presentation/dispatcher';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import {
  REQ_CrearUsuario,
  REQ_CrearUsuarioExtended,
} from './dtos/crear-usuario.request';
import { SendResponse } from 'src/common/utils/functions/api-response';
import { IUser } from 'src/common/presentation/interfaces/usuario.interface';

export class AuthGateway {
  // Registro de eventos para el flujo de autenticación/registro dual
  static {
    Dispatcher.registerPrivate({
      'auth:autenticar': (client) =>
        AuthGateway.autenticar(client as AuthSocket),
      'auth:registrar': (client, data) =>
        AuthGateway.registrar(client as AuthSocket, data as REQ_CrearUsuario),
    });
  }

  /**
   * Verificar si el usuario ya existe en la tabla "usuario" del schema public.
   */
  static async autenticar(client: AuthSocket) {
    const response = await UC_Autenticar.execute(client.user.id);

    // Si existe, lo vinculamos al socket para futuras peticiones
    if (response.success) {
      client.usuario = response.data as IUser;
    }

    return response;
  }

  /**
   * Registra al usuario con datos personales adicionales.
   */
  static async registrar(client: AuthSocket, data: REQ_CrearUsuario) {
    try {
      const body = data as Record<string, any>;

      // 1. Mapeamos la entrada al DTO (incluyendo datos de Supabase como fallback)
      const payload = plainToInstance(REQ_CrearUsuarioExtended, {
        ...body,
        id_supabase: client.user.id,
        nombre: (body?.nombre ||
          client.user.user_metadata?.full_name ||
          client.user.email?.split('@')[0]) as string,
        urlFoto: (body?.url_foto ||
          client.user.user_metadata?.avatar_url) as string,
      });

      // 2. Validamos de forma única para esta solicitud
      await validateOrReject(payload);

      // 3. Ejecutamos el caso de uso con el ID de Supabase
      const response = await UC_Registrar.execute({
        id_supabase: payload.id_supabase,
        nombre: payload.nombre as string,
        url_foto: payload.urlFoto,
        foto_b64: payload.foto_b64,
        genero: payload.genero,
        peso: payload.peso,
        talla: payload.talla,
        fecha_nacimiento: payload.fecha_nacimiento,
        nivel_actividad: payload.nivel_actividad,
        informacion_medica: payload.informacion_medica,
        alimentos_prohibidos: payload.alimentos_prohibidos,
        preferencias: payload.preferencias,
        objetivo_fisico: payload.objetivo_fisico,
      });

      if (response.success) {
        client.usuario = response.data as IUser;
      }

      return response;
    } catch (error) {
      return SendResponse.error(
        error instanceof Array
          ? 'Datos de registro inválidos'
          : 'Error en el proceso de registro',
      );
    }
  }
}
