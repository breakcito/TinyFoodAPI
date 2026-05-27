import { Module } from '@nestjs/common';
import { IAService } from './service/ia.service';

// Módulo compartido de infraestructura. Registra servicios globales como
// IAService para que NestJS los construya y la instancia estática quede
// disponible para todos los casos de uso.
@Module({
  providers: [IAService],
  exports: [IAService],
})
export class CommonModule {}
