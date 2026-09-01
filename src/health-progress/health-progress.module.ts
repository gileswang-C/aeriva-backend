import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthProgressController } from './health-progress.controller';
import { HealthProgressService } from './health-progress.service';

@Module({
  imports: [
    PrismaModule,
    NutritionModule,
  ],
  controllers: [
    HealthProgressController,
  ],
  providers: [
    HealthProgressService,
  ],
  exports: [
    HealthProgressService,
  ],
})
export class HealthProgressModule {}
