import { Module } from '@nestjs/common';
import './presentation/user.gateway';
import { SupabaseStorageService } from '../../common/service/supabase-storage.service';

@Module({
  providers: [SupabaseStorageService],
})
export class UserModule {}
