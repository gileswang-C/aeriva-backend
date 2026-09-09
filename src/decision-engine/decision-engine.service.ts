import { Injectable } from '@nestjs/common';
import { HealthGoalsService } from '../health-goals/health-goals.service';

@Injectable()
export class DecisionEngineService {
  constructor(
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  async decide(
    userId: string,
  ) {
    const recommendation =
      await this.healthGoalsService.getRecommendation(
        userId,
      );

    if (
      recommendation.status ===
      'NO_GOAL'
    ) {
      return {
        decision: {
          type:
            'CREATE_GOAL',
        },

        reason:
          'No active health goal',
      };
    }

    if (
      recommendation.status !==
      'AVAILABLE'
    ) {
      return {
        decision: {
          type:
            'INSUFFICIENT_DATA',
        },

        reason:
          'Insufficient health data',
      };
    }

    if (
      'level' in recommendation &&
      recommendation.level ===
      'NEEDS_ADJUSTMENT'
    ) {
      return {
        decision: {
          type:
            'ADJUST_NUTRITION',
        },

        reason:
          'Goal progress needs adjustment',
      };
    }

    return {
      decision: {
        type:
          'CONTINUE',
      },

      reason:
        'Current progress is acceptable',
    };
  }
}
