import { Injectable } from '@nestjs/common';

import {
  DecisionContext,
} from '../rules/decision-rule.interface';

import {
  HealthGoalsService,
} from '../../health-goals/health-goals.service';

import {
  BodyStateService,
} from '../../body-state/body-state.service';

import {
  NutritionContextAdapter,
} from '../adapters/nutrition-context.adapter';

import {
  PainRiskContextAdapter,
} from '../adapters/pain-risk-context.adapter';


@Injectable()
export class DecisionContextBuilder {

  constructor(
    private readonly healthGoalsService: HealthGoalsService,

    private readonly bodyStateService: BodyStateService,

    private readonly nutritionAdapter: NutritionContextAdapter,

    private readonly painRiskAdapter: PainRiskContextAdapter,
  ) {}


  async build(
    userId: string,
  ): Promise<DecisionContext> {


    const recommendation =
      await this.healthGoalsService.getRecommendation(
        userId,
      );


    const bodyState =
      await this.bodyStateService.getTodayReadiness(
        userId,
      );


    const nutrition =
      await this.nutritionAdapter.build(
        userId,
      );


    const painRisk =
      await this.painRiskAdapter.build(
        userId,
      );


    return {

      userId,


      healthGoal:
        recommendation.status === 'AVAILABLE'
          ? {
              recommendationLevel:
                'level' in recommendation
                  ? recommendation.level
                  : undefined,
            }
          : undefined,


      bodyState,

      nutrition,

      painRisk,

    };
  }
}
