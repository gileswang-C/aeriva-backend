import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { EquipmentModule } from './equipment/equipment.module';
import { UserEquipmentModule } from './user-equipment/user-equipment.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [EquipmentModule, UserEquipmentModule, PrismaModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
