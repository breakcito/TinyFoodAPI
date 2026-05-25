// Módulo compartido de infraestructura. Registra servicios globales como
// GeminiService para que NestJS los construya y la instancia estática quede
// disponible para todos los casos de uso.
// ─────────────────────────────────────────────────────────────────────────────
 
import { Module } from '@nestjs/common';
import { GeminiService } from './service/gemini.service';
 
@Module({
  providers: [GeminiService],
  exports: [GeminiService],
})
export class CommonModule {}