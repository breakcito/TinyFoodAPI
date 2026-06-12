import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../common/service/prisma.service';

@Injectable()
export class DespensaScheduler {
  private readonly logger = new Logger(DespensaScheduler.name);

  // Ejecutar cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async eliminarAlimentosConsumidos() {
    try {
      this.logger.log(
        'Iniciando limpieza de alimentos consumidos hace más de 24 horas...',
      );

      const hace24Horas = new Date();
      hace24Horas.setHours(hace24Horas.getHours() - 24);

      const resultado = await PrismaService.db.comida.deleteMany({
        where: {
          estado: 'Consumido',
          updated_at: {
            lte: hace24Horas,
          },
        },
      });

      if (resultado.count > 0) {
        this.logger.log(
          `Se eliminaron ${resultado.count} alimentos consumidos.`,
        );
      } else {
        this.logger.log('No hay alimentos consumidos para eliminar.');
      }
    } catch (error) {
      this.logger.error(
        'Error durante la limpieza de alimentos consumidos:',
        error,
      );
    }
  }
}
