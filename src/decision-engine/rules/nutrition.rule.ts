import {
  DecisionRule,
  DecisionContext,
  DecisionResult,
} from './decision-rule.interface';


export class NutritionRule
  implements DecisionRule {

  evaluate(
    context: DecisionContext,
  ):
    | DecisionResult
    | null {

    if (
      !context.nutrition
    ) {
      return null;
    }


    if (
      context.nutrition.calorieGap < -500
    ) {
      return {
        type:
          'ADJUST_NUTRITION',

        reason:
          'Calorie intake is too low',

        priority:
          80,
      };
    }


    return null;
  }
}
