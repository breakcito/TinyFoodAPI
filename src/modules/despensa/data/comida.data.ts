import { PrismaService } from '../../../common/service/prisma.service';

export class ComidaData {
  /** Buscar todos los alimentos de un usuario */
  static async findAllByUserId(id_usuario: number) {
    return PrismaService.db.comida.findMany({
      where: { id_usuario },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Buscar un alimento por su ID */
  static async findById(id: number) {
    return PrismaService.db.comida.findUnique({
      where: { id },
    });
  }

  /** Crear un nuevo alimento */
  static async create(
    id_usuario: number,
    payload: {
      nombre: string;
      cantidad: string;
      descripcion?: string;
      incluir_hora?: boolean;
      fecha_compra?: Date;
      hora_compra?: Date;
      fecha_vencimiento?: Date;
      hora_vencimiento?: Date;
      tags?: string;
      estado?: string;
    },
  ) {
    return PrismaService.db.comida.create({
      data: {
        ...payload,
        id_usuario,
      },
    });
  }

  /** Actualizar un alimento existente */
  static async update(
    id: number,
    payload: {
      nombre?: string;
      cantidad?: string;
      descripcion?: string;
      incluir_hora?: boolean;
      fecha_compra?: Date;
      hora_compra?: Date;
      fecha_vencimiento?: Date;
      hora_vencimiento?: Date;
      tags?: string;
      estado?: string;
    },
  ) {
    return PrismaService.db.comida.update({
      where: { id },
      data: payload,
    });
  }

  /** Eliminar un alimento */
  static async delete(id: number) {
    return PrismaService.db.comida.delete({
      where: { id },
    });
  }
}
