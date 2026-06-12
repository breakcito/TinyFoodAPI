import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { PublicGateway } from './common/presentation/gateways/public.gateway';
import { PrivateGateway } from './common/presentation/gateways/private.gateway';
import { UserModule } from './modules/usuario/user.module';
import { DespensaModule } from './modules/despensa/despensa.module';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    AuthModule,
    UserModule,
    DespensaModule,
  ],
  controllers: [AppController],
  providers: [PublicGateway, PrivateGateway],
})
export class AppModule {}
