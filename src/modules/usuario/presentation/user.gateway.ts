import { AuthSocket } from 'src/common/presentation/interfaces/auth-socket.interface';
import { Dispatcher } from 'src/common/presentation/dispatcher';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { REQ_ActualizarPerfil } from './dtos/actualizar-perfil.request';
import { SendResponse } from 'src/common/utils/functions/api-response';
import { UC_ActualizarPerfil } from '../logic/actualizar-perfil.uc';

export class UserGateway {
  static {
    Dispatcher.registerPrivate({
      'usuario:actualizar_perfil': (client, data) =>
        UserGateway.actualizarPerfil(client as AuthSocket, data),
    });
  }

  static async actualizarPerfil(client: AuthSocket, data: unknown) {
    try {
      // Verificar que el usuario esté autenticado en el socket
      if (!client.usuario) {
        return SendResponse.error('Usuario no autenticado');
      }
      const payload = plainToInstance(REQ_ActualizarPerfil, data);
      await validateOrReject(payload);

      return await UC_ActualizarPerfil.execute(
        client.usuario, // Pasar el objeto usuario de la base de datos completo
        payload,
      );
    } catch (error) {
      return SendResponse.error(
        error instanceof Array
          ? 'Datos inválidos'
          : 'Error al actualizar el perfil',
      );
    }
  }
}
