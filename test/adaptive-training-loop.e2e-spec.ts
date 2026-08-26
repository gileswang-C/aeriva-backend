import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Adaptive Training Loop (e2e)', () => {
  let app: INestApplication<App>;

  const userId = 'e2e-adaptive-user';

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('refreshes feedback adjustment and applies it to the next adaptive plan', async () => {
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
        note: 'E2E adaptive loop test',
      })
      .expect(200);

    const firstPlanResponse =
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

    expect(
      firstPlanResponse.body.data.readiness
        .readinessStatus,
    ).toBe('READY');

    const firstPlan =
      firstPlanResponse.body.data.plan;

    expect(firstPlan).not.toBeNull();

    const pulldown =
      firstPlan.exercises.find(
        (exercise: {
          exerciseId: number;
        }) =>
          exercise.exerciseId === 3,
      );

    expect(pulldown).toBeDefined();

    const startResponse =
      await request(app.getHttpServer())
        .post('/training-sessions/start')
        .send({
          userId,
          planId: firstPlan.planId,
        })
        .expect(201);

    const sessionId =
      startResponse.body.data.sessionId;

    for (let setNumber = 1; setNumber <= 3; setNumber++) {
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber,
          reps: 10,
          weightKg: 35,
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/complete`,
      )
      .expect(201);

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${sessionId}`,
      )
      .send({
        difficultyLevel: 2,
        fatigueLevel: 2,
        painLevel: 4,
        note: 'E2E pain feedback',
      })
      .expect(200);

    const adjustmentResponse =
      await request(app.getHttpServer())
        .get(
          `/training-adjustments/latest/${userId}`,
        )
        .expect(200);

    expect(
      adjustmentResponse.body.data.sessionId,
    ).toBe(sessionId);

    const pulldownAdjustment =
      adjustmentResponse.body.data.adjustments.find(
        (adjustment: {
          exerciseId: number;
        }) =>
          adjustment.exerciseId === 3,
      );

    expect(pulldownAdjustment).toBeDefined();
    expect(
      pulldownAdjustment.action,
    ).toBe('REDUCE_WEIGHT');
    expect(
      pulldownAdjustment.suggestedWeightKg,
    ).toBe(32.5);

    const nextPlanResponse =
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

    const nextPlan =
      nextPlanResponse.body.data.plan;

    expect(nextPlan).not.toBeNull();

    const nextPulldown =
      nextPlan.exercises.find(
        (exercise: {
          exerciseId: number;
        }) =>
          exercise.exerciseId === 3,
      );

    expect(nextPulldown).toBeDefined();
    expect(
      nextPulldown.targetWeightKg,
    ).toBe(32.5);
  });
});
