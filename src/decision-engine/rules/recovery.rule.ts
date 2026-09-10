import {
  DecisionRule,
  DecisionContext,
  DecisionResult,
} from './decision-rule.interface';


export class RecoveryRule
  implements DecisionRule {

  evaluate(
    context: DecisionContext,
  ):
    | DecisionResult
    | null {

    if (
      !context.bodyState
    ) {
      return null;
    }


    if (
      context.bodyState.readinessStatus ===
      'LOW'
    ) {
      return {
        type:
          'RECOVERY',

        reason:
          'Low readiness requires recovery',

        priority:
          90,
      };
    }


    return null;
  }
}
