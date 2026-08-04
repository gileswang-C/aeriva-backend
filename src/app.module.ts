import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { EquipmentModule } from './equipment/equipment.module';
import { UserEquipmentModule } from './user-equipment/user-equipment.module';

@Module({
  imports: [EquipmentModule, UserEquipmentModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
