import { AuthSocket } from 'src/common/presentation/interfaces/auth-socket.interface';
import { Dispatcher } from 'src/common/presentation/dispatcher';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { SendResponse } from 'src/common/utils/functions/api-response';
 
import { UC_RegistrarComida } from '../logic/registro-comida.uc';
import { UC_ListarComida } from '../logic/listar-comida.uc';
import { UC_ActualizarComida } from '../logic/actualizar-comida.uc';
import { UC_EliminarComida } from '../logic/eliminar-comida.uc';
import { UC_AnalizarImagen } from '../logic/analizar-imagen.uc';
 
import { REQ_RegistrarComida } from './dtos/registrar-comida.request';
import { REQ_ActualizarComida } from './dtos/actualizar-comida.request';
import { REQ_AnalizarImagen } from './dtos/analizar-imagen.request';

export class DespensaGateway {
  static register() {
    // ── CRUD de alimentos 
    Dispatcher.registerPrivate({
      'despensa:listar_comida': (client) =>
        DespensaGateway.listarComida(client as AuthSocket),

      'despensa:registrar_comida': (client, data) =>
        DespensaGateway.registrarComida(
          client as AuthSocket,
          data as REQ_RegistrarComida,
        ),

      'despensa:actualizar_comida': (client, data) =>
        DespensaGateway.actualizarComida(
          client as AuthSocket,
          data as REQ_ActualizarComida,
        ),

      'despensa:eliminar_comida': (client, data) =>
        DespensaGateway.eliminarComida(
          client as AuthSocket,
          data as { id: number },
        ),
        // ── IA: Análisis de imagen 
      'despensa:analizar_imagen': (client, data) =>
        DespensaGateway.analizarImagen(
          client as AuthSocket,
          data as REQ_AnalizarImagen,
        ),
    });
  }

  static async listarComida(client: AuthSocket) {
    if (!client.usuario) return SendResponse.error('Usuario no autenticado');
    return await UC_ListarComida.execute(client.usuario.id);
  }

  static async registrarComida(client: AuthSocket, data: REQ_RegistrarComida) {
    try {
      if (!client.usuario) return SendResponse.error('Usuario no autenticado');
      const payload = plainToInstance(REQ_RegistrarComida, data);
      await validateOrReject(payload);
      return await UC_RegistrarComida.execute(client.usuario.id, payload);
    } catch (error) {
      console.error('[DespensaGateway] Error al registrar comida:', error);
      return SendResponse.error('Datos de registro inválidos');
    }
  }

  static async actualizarComida(
    client: AuthSocket,
    data: REQ_ActualizarComida,
  ) {
    try {
      if (!client.usuario) return SendResponse.error('Usuario no autenticado');
      const payload = plainToInstance(REQ_ActualizarComida, data);
      await validateOrReject(payload);
      return await UC_ActualizarComida.execute(client.usuario.id, payload);
    } catch (error) {
      console.error('[DespensaGateway] Error al actualizar comida:', error);
      return SendResponse.error('Datos de actualización inválidos');
    }
  }

  static async eliminarComida(client: AuthSocket, data: { id: number }) {
    try {
      if (!client.usuario) return SendResponse.error('Usuario no autenticado');
      if (!data || typeof data.id !== 'number')
        return SendResponse.error('ID de alimento inválido');
      return await UC_EliminarComida.execute(client.usuario.id, data.id);
    } catch (error) {
      console.error('[DespensaGateway] Error al eliminar comida:', error);
      return SendResponse.error('Error al eliminar alimento');
    }
  }
  //IA
  static async analizarImagen(client: AuthSocket, data: REQ_AnalizarImagen) {
    try {
      if (!client.usuario) return SendResponse.error('Usuario no autenticado');
 
      const payload = plainToInstance(REQ_AnalizarImagen, data);
      await validateOrReject(payload);
 
      return await UC_AnalizarImagen.execute(
        payload.foto_b64!,
        payload.mime_type ?? 'image/jpeg',
      );
    } catch (error) {
      console.error('[DespensaGateway] Error al analizar imagen:', error);
      return SendResponse.error('Error al procesar la imagen');
    }
  }
}
