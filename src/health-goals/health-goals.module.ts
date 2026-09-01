import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthGoalsController } from './health-goals.controller';
import { HealthGoalsService } from './health-goals.service';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    HealthGoalsController,
  ],
  providers: [
    HealthGoalsService,
  ],
  exports: [
    HealthGoalsService,
  ],
})
export class HealthGoalsModule {}
