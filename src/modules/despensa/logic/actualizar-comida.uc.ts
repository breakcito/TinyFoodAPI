import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { ComidaData } from '../data/comida.data';
import { REQ_ActualizarComida } from '../presentation/dtos/actualizar-comida.request';

export class UC_ActualizarComida {
  static async execute(
    id_usuario: number,
    data: REQ_ActualizarComida,
  ): Promise<ApiResponse> {
    try {
      const { id, ...rest } = data;

      // Verificar pertenencia
      const comida = await ComidaData.findById(id);
      if (!comida || comida.id_usuario !== id_usuario) {
        return SendResponse.error('Alimento no encontrado o no autorizado');
      }

      // Procesar fechas
      const payload = {
        ...rest,
        fecha_vencimiento: rest.fecha_vencimiento
          ? new Date(rest.fecha_vencimiento)
          : undefined,
      };

      const comidaActualizada = await ComidaData.update(id, payload);
      return SendResponse.success(
        comidaActualizada,
        'Alimento actualizado con éxito',
      );
    } catch (error) {
      console.error('[UC_ActualizarComida] Error:', error);
      return SendResponse.error('Error al actualizar el alimento');
    }
  }
}
