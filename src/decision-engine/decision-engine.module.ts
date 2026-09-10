import { Module } from '@nestjs/common';
import { HealthGoalsModule } from '../health-goals/health-goals.module';
import { BodyStateModule } from '../body-state/body-state.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { PainRiskModule } from '../pain-risk/pain-risk.module';
import { PainRiskContextAdapter } from './adapters/pain-risk-context.adapter';
import { NutritionContextAdapter } from './adapters/nutrition-context.adapter';
import { DecisionEngineController } from './decision-engine.controller';
import { DecisionEngineService } from './decision-engine.service';
import { DecisionContextBuilder } from './context/decision-context.builder';

@Module({
  imports: [
    HealthGoalsModule,
    BodyStateModule,
    NutritionModule,
    PainRiskModule,
  ],
  controllers: [
    DecisionEngineController,
  ],
  providers: [
    DecisionEngineService,
    DecisionContextBuilder,
    NutritionContextAdapter,
    PainRiskContextAdapter,
  ],
  exports: [
    DecisionEngineService,
  ],
})
export class DecisionEngineModule {}
