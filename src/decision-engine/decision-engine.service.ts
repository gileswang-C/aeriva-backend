import { Injectable } from '@nestjs/common';

import {
  DecisionRule,
} from './rules/decision-rule.interface';

import {
  PainRiskRule,
} from './rules/pain-risk.rule';

import {
  RecoveryRule,
} from './rules/recovery.rule';

import {
  NutritionRule,
} from './rules/nutrition.rule';

import {
  GoalProgressRule,
} from './rules/goal-progress.rule';

import { DecisionContextBuilder } from './context/decision-context.builder';


@Injectable()
export class DecisionEngineService {

  private readonly rules:
    DecisionRule[] = [
      new PainRiskRule(),
      new RecoveryRule(),
      new NutritionRule(),
      new GoalProgressRule(),
    ];


  constructor(
    private readonly contextBuilder: DecisionContextBuilder,
  ) {}


  async decide(
    userId: string,
  ) {

    const context =
      await this.contextBuilder.build(
        userId,
      );


    const decisions =
      this.rules
        .map(
          rule =>
            rule.evaluate(
              context,
            ),
        )
        .filter(
          Boolean,
        )
        .sort(
          (a, b) =>
            (b?.priority ?? 0) -
            (a?.priority ?? 0),
        );


    if (
      decisions.length > 0
    ) {
      return {
        decision: {
          type:
            decisions[0]!.type,
        },

        reason:
          decisions[0]!.reason,
      };
    }


    if (
      !context.healthGoal
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


    return {
      decision: {
        type:
          'INSUFFICIENT_DATA',
      },

      reason:
        'Insufficient health data',
    };
  }
}
