export interface DecisionRule {
  evaluate(
    context: DecisionContext,
  ):
    | DecisionResult
    | null;
}


export interface DecisionContext {
  userId: string;

  healthGoal?: any;

  bodyState?: any;

  painRisk?: any;

  nutrition?: any;
}


export interface DecisionResult {
  type:
    | 'CREATE_GOAL'
    | 'CONTINUE'
    | 'ADJUST_NUTRITION'
    | 'MODIFY_TRAINING'
    | 'RECOVERY'
    | 'INSUFFICIENT_DATA';

  reason: string;

  priority?: number;
}
