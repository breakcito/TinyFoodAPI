import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { ComidaData } from '../data/comida.data';
import { REQ_RegistrarComida } from '../presentation/dtos/registrar-comida.request';

export class UC_RegistrarComida {
  static async execute(
    id_usuario: number,
    data: REQ_RegistrarComida,
  ): Promise<ApiResponse> {
    try {
      // Procesar fechas si existen
      const { ...rest } = data;
      const payload = {
        ...rest,
        fecha_compra: rest.fecha_compra
          ? new Date(rest.fecha_compra)
          : undefined,
        hora_compra: rest.hora_compra ? new Date(rest.hora_compra) : undefined,
        fecha_vencimiento: rest.fecha_vencimiento
          ? new Date(rest.fecha_vencimiento)
          : undefined,
        hora_vencimiento: rest.hora_vencimiento
          ? new Date(rest.hora_vencimiento)
          : undefined,
      };

      const nuevaComida = await ComidaData.create(id_usuario, payload);
      return SendResponse.success(nuevaComida, 'Alimento registrado con éxito');
    } catch (error) {
      console.error('[UC_RegistrarComida] Error:', error);
      return SendResponse.error('Error al registrar el alimento');
    }
  }
}
