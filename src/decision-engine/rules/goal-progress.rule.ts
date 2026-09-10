import {
  DecisionRule,
  DecisionContext,
  DecisionResult,
} from './decision-rule.interface';


export class GoalProgressRule
  implements DecisionRule {

  evaluate(
    context: DecisionContext,
  ):
    | DecisionResult
    | null {

    if (
      !context.healthGoal
    ) {
      return null;
    }


    if (
      context.healthGoal.recommendationLevel ===
      'NEEDS_ADJUSTMENT'
    ) {
      return {
        type:
          'ADJUST_NUTRITION',

        reason:
          'Health goal progress needs adjustment',

        priority:
          70,
      };
    }


    if (
      context.healthGoal.recommendationLevel ===
      'AHEAD' ||
      context.healthGoal.recommendationLevel ===
      'OPTIMAL'
    ) {
      return {
        type:
          'CONTINUE',

        reason:
          'Health goal progress is acceptable',

        priority:
          60,
      };
    }


    return null;
  }
}
