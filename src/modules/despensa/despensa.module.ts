import { Module, OnModuleInit } from '@nestjs/common';
import { DespensaGateway } from './presentation/despensa.gateway';
import { DespensaScheduler } from './logic/despensa.scheduler';

@Module({
  providers: [DespensaScheduler],
})
export class DespensaModule implements OnModuleInit {
  onModuleInit() {
    DespensaGateway.register();
  }
}
