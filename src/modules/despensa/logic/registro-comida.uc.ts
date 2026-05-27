import { ApiResponse } from '../../../common/logic/dtos/api.response';
import { SendResponse } from '../../../common/utils/functions/api-response';
import { ComidaData } from '../data/comida.data';
import { REQ_RegistrarComida } from '../presentation/dtos/registrar-comida.request';
import { RES_Comida } from './dtos/despensa.responses';

export class UC_RegistrarComida {
  static async execute(
    id_usuario: number,
    data: REQ_RegistrarComida[],
  ): Promise<ApiResponse> {
    try {
      const payloads = data.map((item) => ({
        ...item,
        fecha_vencimiento: item.fecha_vencimiento
          ? new Date(item.fecha_vencimiento)
          : undefined,
      }));

      const createdItems = await ComidaData.createMany(id_usuario, payloads);

      return SendResponse.success(
        createdItems as RES_Comida[],
        'Alimentos registrados con éxito',
      );
    } catch (error) {
      console.error('[UC_RegistrarComida] Error:', error);
      return SendResponse.error('Error al registrar el alimento');
    }
  }
}
