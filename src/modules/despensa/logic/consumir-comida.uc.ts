import { ComidaData } from '../data/comida.data';

export class ConsumirComidaUC {
  static async execute(
    id_usuario: number,
    payload: { id: number; cantidadRestante: string },
  ) {
    try {
      const { id, cantidadRestante } = payload;

      const comida = await ComidaData.findById(id);
      if (!comida) {
        throw new Error('No se encontró el alimento');
      }

      if (comida.id_usuario !== id_usuario) {
        throw new Error('No tienes permiso para consumir este alimento');
      }

      const updated = await ComidaData.consumir(id, cantidadRestante);

      return {
        success: true,
        message:
          updated.estado === 'Consumido'
            ? '¡Alimento consumido por completo!'
            : 'Cantidad actualizada correctamente',
        data: updated,
      };
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Error al consumir el alimento: ' + String(error));
    }
  }
}
