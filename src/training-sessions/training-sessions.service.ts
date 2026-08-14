import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new BadRequestException(
        `Training plan not found: ${planId}`,
      );
    }

    if (plan.userId !== userId) {
      throw new BadRequestException(
        'Training plan does not belong to this user',
      );
    }

    const activeSession =
      await this.prisma.trainingSession.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

    if (activeSession) {
      throw new BadRequestException(
        `User already has an active training session: ${activeSession.id}`,
      );
    }

    const session =
      await this.prisma.trainingSession.create({
        data: {
          userId,
          planId,
          status: 'IN_PROGRESS',
        },
      });

    return {
      sessionId: session.id,
      userId: session.userId,
      planId: session.planId,
      status: session.status,
      startedAt: session.startedAt,
    };
  }

  async findCurrentByUserId(userId: string) {
    const activeSession =
      await this.prisma.trainingSession.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

    if (!activeSession) {
      return null;
    }

    return this.findById(activeSession.id);
  }

  async findById(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          plan: {
            include: {
              exercises: {
                include: {
                  exercise: true,
                },
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
          sets: {
            orderBy: [
              {
                planExerciseId: 'asc',
              },
              {
                setNumber: 'asc',
              },
            ],
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    const exercises = session.plan.exercises.map(
      (planExercise) => {
        const recordedSets = session.sets
          .filter(
            (set) =>
              set.planExerciseId === planExercise.id,
          )
          .map((set) => ({
            setLogId: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weightKg: set.weightKg,
            completed: set.completed,
          }));

        return {
          planExerciseId: planExercise.id,
          exerciseId: planExercise.exerciseId,
          exerciseName: planExercise.exercise.name,
          order: planExercise.order,
          sets: planExercise.sets,
          reps: planExercise.reps,
          restSeconds: planExercise.restSeconds,
          targetWeightKg:
            planExercise.targetWeightKg,
          recordedSets,
        };
      },
    );

    return {
      sessionId: session.id,
      userId: session.userId,
      planId: session.planId,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      plan: {
        environment: session.plan.environment,
        targetMuscle: session.plan.targetMuscle,
        exercises,
      },
      sets: session.sets,
    };
  }

  async logSet(
    sessionId: number,
    exerciseId: number,
    setNumber: number,
    reps: number,
    weightKg?: number,
  ) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Training session is not in progress',
      );
    }

    const planExercise =
      await this.prisma.trainingPlanExercise.findFirst({
        where: {
          planId: session.planId,
          exerciseId,
        },
        include: {
          exercise: true,
        },
      });

    if (!planExercise) {
      throw new BadRequestException(
        `Exercise ${exerciseId} is not part of this training plan`,
      );
    }

    if (
      setNumber < 1 ||
      setNumber > planExercise.sets
    ) {
      throw new BadRequestException(
        `setNumber must be between 1 and ${planExercise.sets}`,
      );
    }

    const setLog =
      await this.prisma.trainingSetLog.upsert({
        where: {
          sessionId_planExerciseId_setNumber: {
            sessionId,
            planExerciseId: planExercise.id,
            setNumber,
          },
        },
        update: {
          reps,
          weightKg: weightKg ?? null,
          completed: true,
        },
        create: {
          sessionId,
          planExerciseId: planExercise.id,
          setNumber,
          reps,
          weightKg: weightKg ?? null,
          completed: true,
        },
      });

    return {
      setLogId: setLog.id,
      sessionId,
      exerciseId,
      exerciseName: planExercise.exercise.name,
      setNumber,
      reps: setLog.reps,
      weightKg: setLog.weightKg,
      completed: setLog.completed,
    };
  }

  async complete(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          plan: {
            include: {
              exercises: true,
            },
          },
          sets: {
            where: {
              completed: true,
            },
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Training session is not in progress',
      );
    }

    const expectedSetCount = session.plan.exercises.reduce(
      (total, exercise) => total + exercise.sets,
      0,
    );

    const completedSetCount = session.sets.length;

    if (completedSetCount < expectedSetCount) {
      throw new BadRequestException(
        `Training session is incomplete: ${completedSetCount}/${expectedSetCount} sets completed`,
      );
    }

    const completedSession =
      await this.prisma.trainingSession.update({
        where: {
          id: sessionId,
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

    return {
      sessionId: completedSession.id,
      userId: completedSession.userId,
      planId: completedSession.planId,
      status: completedSession.status,
      startedAt: completedSession.startedAt,
      completedAt: completedSession.completedAt,
      completedSetCount,
      expectedSetCount,
    };
  }

  async cancel(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          sets: {
            where: {
              completed: true,
            },
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Only an in-progress training session can be cancelled',
      );
    }

    const cancelledSession =
      await this.prisma.trainingSession.update({
        where: {
          id: sessionId,
        },
        data: {
          status: 'CANCELLED',
        },
      });

    return {
      sessionId: cancelledSession.id,
      userId: cancelledSession.userId,
      planId: cancelledSession.planId,
      status: cancelledSession.status,
      startedAt: cancelledSession.startedAt,
      completedAt: cancelledSession.completedAt,
      recordedSetCount: session.sets.length,
    };
  }
}
