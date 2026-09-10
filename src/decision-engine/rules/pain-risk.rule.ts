import {
  DecisionRule,
  DecisionContext,
  DecisionResult,
} from './decision-rule.interface';


export class PainRiskRule
  implements DecisionRule {

  evaluate(
    context: DecisionContext,
  ):
    | DecisionResult
    | null {

    if (
      !context.painRisk
    ) {
      return null;
    }


    if (
      context.painRisk.hasPain ===
      true
    ) {
      return {
        type:
          'MODIFY_TRAINING',

        reason:
          'Pain areas were reported today',

        priority:
          100,
      };
    }


    return null;
  }
}
