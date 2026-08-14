import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { EquipmentModule } from './equipment/equipment.module';
import { UserEquipmentModule } from './user-equipment/user-equipment.module';
import { PrismaModule } from './prisma/prisma.module';
import { ExercisesModule } from './exercises/exercises.module';
import { TrainingPlansModule } from './training-plans/training-plans.module';
import { TrainingSessionsModule } from './training-sessions/training-sessions.module';
import { BodyStateModule } from './body-state/body-state.module';

@Module({
  imports: [EquipmentModule, UserEquipmentModule, PrismaModule, ExercisesModule, TrainingPlansModule, TrainingSessionsModule, BodyStateModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
