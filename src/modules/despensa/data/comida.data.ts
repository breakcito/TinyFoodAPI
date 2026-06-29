import { PrismaService } from '../../../common/service/prisma.service';

export class ComidaData {
  /** Buscar todos los alimentos de un usuario */
  static async findAllByUserId(id_usuario: number) {
    return PrismaService.db.comida.findMany({
      where: { id_usuario },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Buscar alimentos disponibles ordenados por fecha de vencimiento (limite opcional) */
  static async findAvailableOrderByVencimiento(
    id_usuario: number,
    limit: number = 15,
  ) {
    return PrismaService.db.comida.findMany({
      where: {
        id_usuario,
        estado: 'Por consumir',
      },
      orderBy: [
        {
          fecha_vencimiento: 'asc',
        },
        {
          created_at: 'desc',
        },
      ],
      take: limit,
    });
  }

  /** Buscar un alimento por su ID */
  static async findById(id: number) {
    return PrismaService.db.comida.findUnique({
      where: { id },
    });
  }

  /** Crear múltiples alimentos en lote (bulk create) */
  static async createMany(
    id_usuario: number,
    payloads: Array<{
      nombre: string;
      cantidad: string;
      descripcion?: string;
      fecha_vencimiento?: Date;
      tags?: string[];
      estado?: string;
    }>,
  ) {
    return PrismaService.db.comida.createManyAndReturn({
      data: payloads.map((payload) => ({
        ...payload,
        id_usuario,
      })),
    });
  }

  /** Actualizar un alimento existente */
  static async update(
    id: number,
    payload: {
      nombre?: string;
      cantidad?: string;
      descripcion?: string;
      fecha_vencimiento?: Date;
      tags?: string[];
      estado?: string;
    },
  ) {
    return PrismaService.db.comida.update({
      where: { id },
      data: payload,
    });
  }

  /** Consumir alimento (reduce cantidad o cambia a Consumido) */
  static async consumir(id: number, cantidadRestante: string) {
    const clean = cantidadRestante.trim().toLowerCase();
    const isZero =
      clean === '0' ||
      clean === 'consumido' ||
      clean.startsWith('0 ') ||
      clean === '0g' ||
      clean === '0 g' ||
      ['0', '0 unidades', '0 porciones', '0 g', '0g'].includes(clean);
    return PrismaService.db.comida.update({
      where: { id },
      data: {
        cantidad: isZero ? '0' : cantidadRestante,
        estado: isZero ? 'Consumido' : undefined,
      },
    });
  }

  /** Eliminar un alimento */
  static async delete(id: number) {
    return PrismaService.db.comida.delete({
      where: { id },
    });
  }
}
