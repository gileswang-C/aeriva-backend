import { Module } from '@nestjs/common';
import { HealthGoalsModule } from '../health-goals/health-goals.module';
import { DecisionEngineController } from './decision-engine.controller';
import { DecisionEngineService } from './decision-engine.service';

@Module({
  imports: [
    HealthGoalsModule,
  ],
  controllers: [
    DecisionEngineController,
  ],
  providers: [
    DecisionEngineService,
  ],
  exports: [
    DecisionEngineService,
  ],
})
export class DecisionEngineModule {}
