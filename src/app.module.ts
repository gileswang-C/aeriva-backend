import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { EquipmentModule } from './equipment/equipment.module';

@Module({
  imports: [EquipmentModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
