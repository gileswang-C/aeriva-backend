import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Health Goals (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app =
      moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and retrieves active health goal', async () => {
    const userId =
      'e2e-health-goal-user';

    const createResponse =
      await request(app.getHttpServer())
        .post('/health-goals')
        .send({
          userId,
          goalType:
            'WEIGHT_LOSS',
          startWeightKg:
            75,
          targetWeightKg:
            68,
          startDate:
            '2026-09-01T00:00:00.000Z',
          targetDate:
            '2026-12-31T00:00:00.000Z',
        })
        .expect(201);

    expect(
      createResponse.body.data.status,
    ).toBe('ACTIVE');

    expect(
      createResponse.body.data.goalType,
    ).toBe('WEIGHT_LOSS');

    const activeResponse =
      await request(app.getHttpServer())
        .get(
          `/health-goals/${userId}/active`,
        )
        .expect(200);

    expect(
      activeResponse.body.data.targetWeightKg,
    ).toBe(68);

    expect(
      activeResponse.body.data.status,
    ).toBe('ACTIVE');
  });

  it('calculates weight loss goal progress', async () => {
    const userId =
      'e2e-health-goal-progress-user';

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          75,
        targetWeightKg:
          68,
        startDate:
          '2026-09-01T00:00:00.000Z',
        targetDate:
          '2026-12-31T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          72.5,
        measuredAt:
          '2026-09-08T08:00:00.000Z',
      })
      .expect(201);

    const response =
      await request(app.getHttpServer())
        .get(
          `/health-goals/${userId}/progress`,
        )
        .expect(200);

    expect(
      response.body.data.status,
    ).toBe('AVAILABLE');

    expect(
      response.body.data.currentWeightKg,
    ).toBe(72.5);

    expect(
      response.body.data.remainingKg,
    ).toBe(4.5);

    expect(
      response.body.data.progressPercent,
    ).toBe(35.7);

    expect(
      response.body.data.trend,
    ).toBe('ON_TRACK');

    const noGoalResponse =
      await request(app.getHttpServer())
        .get(
          '/health-goals/e2e-health-goal-no-goal/progress',
        )
        .expect(200);

    expect(
      noGoalResponse.body.data.status,
    ).toBe('NO_GOAL');
  });


  it('rejects invalid health goal creation inputs', async () => {
    const userId =
      'e2e-health-goal-validation-user';

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'INVALID_GOAL',
        startWeightKg:
          75,
        targetWeightKg:
          68,
        startDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          -1,
        targetWeightKg:
          68,
        startDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          75,
        targetWeightKg:
          0,
        startDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          75,
        targetWeightKg:
          68,
        startDate:
          'not-a-date',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          75,
        targetWeightKg:
          68,
        startDate:
          '2026-09-01T00:00:00.000Z',
        targetDate:
          'not-a-date',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          75,
        targetWeightKg:
          68,
        startDate:
          '2026-09-10T00:00:00.000Z',
        targetDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(400);
  });

  it('rejects duplicate active health goals', async () => {
    const userId =
      'e2e-health-goal-duplicate-user';

    const payload = {
      userId,
      goalType:
        'WEIGHT_LOSS',
      startWeightKg:
        75,
      targetWeightKg:
        68,
      startDate:
        '2026-09-01T00:00:00.000Z',
      targetDate:
        '2026-12-31T00:00:00.000Z',
    };

    await request(app.getHttpServer())
      .post('/health-goals')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/health-goals')
      .send(payload)
      .expect(409);
  });


  it('completes an active health goal and allows a new goal', async () => {
    const userId =
      'e2e-health-goal-complete-user';

    const createResponse =
      await request(app.getHttpServer())
        .post('/health-goals')
        .send({
          userId,
          goalType:
            'WEIGHT_LOSS',
          startWeightKg:
            75,
          targetWeightKg:
            68,
          startDate:
            '2026-09-01T00:00:00.000Z',
          targetDate:
            '2026-12-31T00:00:00.000Z',
        })
        .expect(201);

    const goalId =
      createResponse.body.data.id;

    const completeResponse =
      await request(app.getHttpServer())
        .post(
          `/health-goals/${goalId}/complete`,
        )
        .expect(201);

    expect(
      completeResponse.body.data.status,
    ).toBe('COMPLETED');

    const activeResponse =
      await request(app.getHttpServer())
        .get(
          `/health-goals/${userId}/active`,
        )
        .expect(200);

    expect(
      activeResponse.body.data,
    ).toBeNull();

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'MAINTAIN',
        startWeightKg:
          68,
        targetWeightKg:
          68,
        startDate:
          '2027-01-01T00:00:00.000Z',
      })
      .expect(201);
  });

  it('cancels an active health goal and allows a new goal', async () => {
    const userId =
      'e2e-health-goal-cancel-user';

    const createResponse =
      await request(app.getHttpServer())
        .post('/health-goals')
        .send({
          userId,
          goalType:
            'WEIGHT_LOSS',
          startWeightKg:
            82,
          targetWeightKg:
            74,
          startDate:
            '2026-09-01T00:00:00.000Z',
        })
        .expect(201);

    const goalId =
      createResponse.body.data.id;

    const cancelResponse =
      await request(app.getHttpServer())
        .post(
          `/health-goals/${goalId}/cancel`,
        )
        .expect(201);

    expect(
      cancelResponse.body.data.status,
    ).toBe('CANCELLED');

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'MUSCLE_GAIN',
        startWeightKg:
          82,
        targetWeightKg:
          86,
        startDate:
          '2026-10-01T00:00:00.000Z',
      })
      .expect(201);
  });

  it('rejects lifecycle changes for inactive or missing goals', async () => {
    const userId =
      'e2e-health-goal-lifecycle-protection-user';

    const createResponse =
      await request(app.getHttpServer())
        .post('/health-goals')
        .send({
          userId,
          goalType:
            'WEIGHT_LOSS',
          startWeightKg:
            78,
          targetWeightKg:
            70,
          startDate:
            '2026-09-01T00:00:00.000Z',
        })
        .expect(201);

    const goalId =
      createResponse.body.data.id;

    await request(app.getHttpServer())
      .post(
        `/health-goals/${goalId}/complete`,
      )
      .expect(201);

    await request(app.getHttpServer())
      .post(
        `/health-goals/${goalId}/complete`,
      )
      .expect(409);

    await request(app.getHttpServer())
      .post(
        `/health-goals/${goalId}/cancel`,
      )
      .expect(409);

    const missingResponse =
      await request(app.getHttpServer())
        .post(
          '/health-goals/999999/cancel',
        )
        .expect(404);

    expect(
      missingResponse.body.message,
    ).toBe(
      'Health goal not found',
    );

    await request(app.getHttpServer())
      .post(
        '/health-goals/not-a-number/complete',
      )
      .expect(400);
  });

});
