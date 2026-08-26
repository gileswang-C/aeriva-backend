import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Training Session State (e2e)', () => {
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
        note: 'E2E session state test',
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

  async function logAllSets(
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
  }

  it('prevents the same user from starting two active sessions', async () => {
    const userId =
      'e2e-session-duplicate-start';

    const plan =
      await preparePlan(userId);

    await startSession(
      userId,
      plan.planId,
    );

    const secondStart =
      await request(app.getHttpServer())
        .post('/training-sessions/start')
        .send({
          userId,
          planId: plan.planId,
        })
        .expect(400);

    expect(
      secondStart.body.message,
    ).toContain(
      'already has an active training session',
    );
  });

  it('updates the same set instead of creating a duplicate set log', async () => {
    const userId =
      'e2e-session-set-upsert';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    const firstSet =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber: 1,
          reps: 8,
          weightKg: 30,
        })
        .expect(201);

    const secondSet =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber: 1,
          reps: 10,
          weightKg: 35,
        })
        .expect(201);

    expect(
      secondSet.body.data.setLogId,
    ).toBe(
      firstSet.body.data.setLogId,
    );

    const sessionResponse =
      await request(app.getHttpServer())
        .get(
          `/training-sessions/${sessionId}`,
        )
        .expect(200);

    const pulldown =
      sessionResponse.body.data.plan.exercises.find(
        (exercise: {
          exerciseId: number;
        }) =>
          exercise.exerciseId === 3,
      );

    expect(
      pulldown.recordedSets,
    ).toHaveLength(1);

    expect(
      pulldown.recordedSets[0].reps,
    ).toBe(10);

    expect(
      pulldown.recordedSets[0].weightKg,
    ).toBe(35);
  });

  it('prevents set logging and repeated completion after a session is completed', async () => {
    const userId =
      'e2e-session-completed-state';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    await logAllSets(sessionId);

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/complete`,
      )
      .expect(201);

    const setAfterComplete =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber: 1,
          reps: 10,
          weightKg: 35,
        })
        .expect(400);

    expect(
      setAfterComplete.body.message,
    ).toBe(
      'Training session is not in progress',
    );

    const repeatedComplete =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/complete`,
        )
        .expect(400);

    expect(
      repeatedComplete.body.message,
    ).toBe(
      'Training session is not in progress',
    );
  });

  it('prevents set logging and completion after a session is cancelled', async () => {
    const userId =
      'e2e-session-cancelled-state';

    const plan =
      await preparePlan(userId);

    const sessionId =
      await startSession(
        userId,
        plan.planId,
      );

    await request(app.getHttpServer())
      .post(
        `/training-sessions/${sessionId}/sets`,
      )
      .send({
        exerciseId: 3,
        setNumber: 1,
        reps: 8,
        weightKg: 30,
      })
      .expect(201);

    const cancelResponse =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/cancel`,
        )
        .expect(201);

    expect(
      cancelResponse.body.data.status,
    ).toBe('CANCELLED');

    const setAfterCancel =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/sets`,
        )
        .send({
          exerciseId: 3,
          setNumber: 2,
          reps: 10,
          weightKg: 35,
        })
        .expect(400);

    expect(
      setAfterCancel.body.message,
    ).toBe(
      'Training session is not in progress',
    );

    const completeAfterCancel =
      await request(app.getHttpServer())
        .post(
          `/training-sessions/${sessionId}/complete`,
        )
        .expect(400);

    expect(
      completeAfterCancel.body.message,
    ).toBe(
      'Training session is not in progress',
    );
  });
});
