import { PainRiskService } from '../pain-risk/pain-risk.service';
import { TrainingPlansService } from './training-plans.service';

describe('TrainingPlansService pain protection', () => {
  it('returns details for exercises filtered by pain risk', async () => {
    const transactionClient = {
      trainingPlan: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
      },
      trainingPlanExercise: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const prisma = {
      trainingSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      trainingPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          userId: 'user-1',
          environment: 'GYM',
          targetMuscle: '腿',
          status: 'ACTIVE',
          createdAt: new Date('2026-08-17T00:00:00Z'),
          exercises: [
            {
              id: 10,
              exerciseId: 2,
              exercise: {
                name: '二头弯举',
              },
              order: 1,
              sets: 2,
              reps: 10,
              restSeconds: 60,
              targetWeightKg: null,
            },
          ],
        }),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof transactionClient) => unknown) =>
          callback(transactionClient),
      ),
    };

    const exercisesService = {
      findAvailableForUser: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: '杠铃深蹲',
        },
        {
          id: 2,
          name: '二头弯举',
        },
      ]),
    };

    const service = new TrainingPlansService(
      prisma as never,
      exercisesService as never,
      {} as never,
      new PainRiskService(),
    );

    const result = await (
      service as unknown as {
        createPlan(
          userId: string,
          environment: string,
          targetMuscle: string,
          options: {
            sets: number;
            weightMultiplier: number;
            painAreas: string[];
          },
        ): Promise<any>;
      }
    ).createPlan('user-1', 'GYM', '腿', {
      sets: 2,
      weightMultiplier: 0.9,
      painAreas: ['左膝疼痛'],
    });

    expect(result.painRiskSummary).toEqual({
      painAreas: ['左膝疼痛'],
      blockedCount: 1,
      blockedExercises: [
        {
          exerciseId: 1,
          exerciseName: '杠铃深蹲',
          risk: 'HIGH',
          reason: '动作涉及当前疼痛区域，不建议增加负荷',
        },
      ],
    });

    expect(
      transactionClient.trainingPlanExercise.create,
    ).toHaveBeenCalledTimes(1);
  });
});
