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
import { TrainingFeedbackModule } from './training-feedback/training-feedback.module';
import { BodyStateModule } from './body-state/body-state.module';
import { PainRiskModule } from './pain-risk/pain-risk.module';
import { TrainingAdjustmentsModule } from './training-adjustments/training-adjustments.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { BodyMetricsModule } from './body-metrics/body-metrics.module';
import { HealthProgressModule } from './health-progress/health-progress.module';

@Module({
  imports: [EquipmentModule, UserEquipmentModule, PrismaModule, ExercisesModule, TrainingPlansModule, TrainingSessionsModule, TrainingFeedbackModule, BodyStateModule, PainRiskModule, TrainingAdjustmentsModule, NutritionModule, BodyMetricsModule, HealthProgressModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
