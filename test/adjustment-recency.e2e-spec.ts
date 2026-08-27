import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Adaptive Adjustment Recency (e2e)', () => {
  let app: INestApplication<App>;

  const userId = 'e2e-adjustment-recency';

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .put(`/user-equipment/${userId}`)
      .send({
        homeEquipmentIds: [],
        gymEquipmentIds: [3],
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(
        `/body-state/${userId}/today?utcOffsetMinutes=480`,
      )
      .send({
        sleepHours: 8,
        sleepQuality: 4,
        energyLevel: 4,
        sorenessLevel: 1,
        stressLevel: 1,
        painAreas: [],
        note: 'E2E adjustment recency test',
      })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  async function generatePlan() {
    const response =
      await request(app.getHttpServer())
        .post(
          '/training-plans/generate-adaptive?utcOffsetMinutes=480',
        )
        .send({
          userId,
          environment: 'GYM',
          targetMuscle: '背部',
        })
        .expect(201);

    return response.body.data.plan;
  }

  async function startSession(
    planId: number,
  ) {
    const response =
      await request(app.getHttpServer())
        .post('/training-sessions/start')
        .send({
          userId,
          planId,
        })
        .expect(201);

    return response.body.data.sessionId;
  }

  async function completePulldownSession(
    sessionId: number,
    weightKg: number,
  ) {
    for (
      let setNumber = 1;
      setNumber <= 3;
      setNumber++
    ) {
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber,
          reps: 10,
          weightKg,
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/complete`,
      )
      .expect(201);
  }

  it('uses the most recently completed session instead of the most recently edited old feedback', async () => {
    const firstPlan =
      await generatePlan();

    const firstSessionId =
      await startSession(
        firstPlan.planId,
      );

    await completePulldownSession(
      firstSessionId,
      35,
    );

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${firstSessionId}`,
      )
      .send({
        difficultyLevel: 5,
        fatigueLevel: 2,
        painLevel: 1,
        note: 'older session feedback',
      })
      .expect(200);

    const secondPlan =
      await generatePlan();

    const secondSessionId =
      await startSession(
        secondPlan.planId,
      );

    await completePulldownSession(
      secondSessionId,
      40,
    );

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${secondSessionId}`,
      )
      .send({
        difficultyLevel: 5,
        fatigueLevel: 2,
        painLevel: 1,
        note: 'newer session feedback',
      })
      .expect(200);

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${firstSessionId}`,
      )
      .send({
        difficultyLevel: 2,
        fatigueLevel: 2,
        painLevel: 4,
        note: 'late edit of older session',
      })
      .expect(200);

    const thirdPlan =
      await generatePlan();

    const pulldown =
      thirdPlan.exercises.find(
        (exercise: {
          exerciseId: number;
        }) =>
          exercise.exerciseId === 3,
      );

    expect(pulldown).toBeDefined();

    expect(
      pulldown.targetWeightKg,
    ).toBe(40);
  });
});
