import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Training Feedback State (e2e)', () => {
  let app: INestApplication<App>;

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

  async function preparePlan(
    userId: string,
  ) {
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
        note: 'E2E feedback state test',
      })
      .expect(200);

    const planResponse =
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

    return planResponse.body.data.plan;
  }

  async function startSession(
    userId: string,
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

  async function completeSession(
    sessionId: number,
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
          weightKg: 35,
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/complete`,
      )
      .expect(201);
  }

  it('rejects feedback for an in-progress session', async () => {
    const userId =
      'e2e-feedback-in-progress';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    const response =
      await request(app.getHttpServer())
        .post(
          `/training-feedback/${sessionId}`,
        )
        .send({
          difficultyLevel: 3,
          fatigueLevel: 2,
          painLevel: 1,
          note: 'should be rejected',
        })
        .expect(400);

    expect(
      response.body.message,
    ).toBe(
      'Training feedback can only be submitted for a completed session',
    );
  });

  it('rejects feedback for a cancelled session', async () => {
    const userId =
      'e2e-feedback-cancelled';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/cancel`,
      )
      .expect(201);

    const response =
      await request(app.getHttpServer())
        .post(
          `/training-feedback/${sessionId}`,
        )
        .send({
          difficultyLevel: 3,
          fatigueLevel: 2,
          painLevel: 1,
          note: 'should be rejected',
        })
        .expect(400);

    expect(
      response.body.message,
    ).toBe(
      'Training feedback can only be submitted for a completed session',
    );
  });

  it('returns 404 for feedback on a missing session', async () => {
    const response =
      await request(app.getHttpServer())
        .put(
          '/training-feedback/999999',
        )
        .send({
          difficultyLevel: 3,
          fatigueLevel: 2,
          painLevel: 1,
          note: 'missing session',
        })
        .expect(404);

    expect(
      response.body.message,
    ).toBe(
      'Training session not found',
    );
  });

  it('replaces adjustments when completed-session feedback is updated', async () => {
    const userId =
      'e2e-feedback-refresh';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    await completeSession(sessionId);

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${sessionId}`,
      )
      .send({
        difficultyLevel: 5,
        fatigueLevel: 2,
        painLevel: 1,
        note: 'first feedback',
      })
      .expect(200);

    const firstAdjustmentResponse =
      await request(app.getHttpServer())
        .get(
          `/training-adjustments/latest/${userId}`,
        )
        .expect(200);

    const firstAdjustments =
      firstAdjustmentResponse.body.data
        .adjustments;

    expect(firstAdjustments).toHaveLength(1);

    expect(
      firstAdjustments[0].exerciseId,
    ).toBe(3);

    expect(
      firstAdjustments[0].action,
    ).toBe('KEEP');

    expect(
      firstAdjustments[0].suggestedWeightKg,
    ).toBe(35);

    await request(app.getHttpServer())
      .put(
        `/training-feedback/${sessionId}`,
      )
      .send({
        difficultyLevel: 2,
        fatigueLevel: 2,
        painLevel: 4,
        note: 'updated feedback',
      })
      .expect(200);

    const secondAdjustmentResponse =
      await request(app.getHttpServer())
        .get(
          `/training-adjustments/latest/${userId}`,
        )
        .expect(200);

    const secondAdjustments =
      secondAdjustmentResponse.body.data
        .adjustments;

    expect(secondAdjustments).toHaveLength(1);

    expect(
      secondAdjustments[0].exerciseId,
    ).toBe(3);

    expect(
      secondAdjustments[0].action,
    ).toBe('REDUCE_WEIGHT');

    expect(
      secondAdjustments[0].suggestedWeightKg,
    ).toBe(32.5);

    expect(
      secondAdjustments[0].id,
    ).not.toBe(
      firstAdjustments[0].id,
    );
  });
});
