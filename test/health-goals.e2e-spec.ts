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
    ).toBe('PROGRESSING');

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


  it('calculates muscle gain goal progress', async () => {
    const userId =
      'e2e-health-goal-muscle-gain-user';

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'MUSCLE_GAIN',
        startWeightKg:
          70,
        targetWeightKg:
          75,
        startDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          72,
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
    ).toBe(72);

    expect(
      response.body.data.remainingKg,
    ).toBe(3);

    expect(
      response.body.data.progressPercent,
    ).toBe(40);

    expect(
      response.body.data.trend,
    ).toBe('PROGRESSING');
  });

  it('evaluates maintain goal range', async () => {
    const userId =
      'e2e-health-goal-maintain-user';

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'MAINTAIN',
        startWeightKg:
          70,
        targetWeightKg:
          70,
        startDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          70.6,
        measuredAt:
          '2026-09-08T08:00:00.000Z',
      })
      .expect(201);

    const withinResponse =
      await request(app.getHttpServer())
        .get(
          `/health-goals/${userId}/progress`,
        )
        .expect(200);

    expect(
      withinResponse.body.data.maintenanceStatus,
    ).toBe('WITHIN_RANGE');

    expect(
      withinResponse.body.data.deviationKg,
    ).toBe(0.6);

    expect(
      withinResponse.body.data.maintenanceRangeKg,
    ).toEqual({
      min: 69,
      max: 71,
    });

    expect(
      withinResponse.body.data.progressPercent,
    ).toBeUndefined();

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          72,
        measuredAt:
          '2026-09-09T08:00:00.000Z',
      })
      .expect(201);

    const outsideResponse =
      await request(app.getHttpServer())
        .get(
          `/health-goals/${userId}/progress`,
        )
        .expect(200);

    expect(
      outsideResponse.body.data.maintenanceStatus,
    ).toBe('OUTSIDE_RANGE');

    expect(
      outsideResponse.body.data.deviationKg,
    ).toBe(2);
  });

  it('caps goal progress at one hundred percent', async () => {
    const userId =
      'e2e-health-goal-cap-user';

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
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          66,
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
      response.body.data.progressPercent,
    ).toBe(100);

    expect(
      response.body.data.remainingKg,
    ).toBe(0);

    expect(
      response.body.data.trend,
    ).toBe('AT_TARGET');
  });

  it('returns goal summary snapshot', async () => {
    const userId =
      'e2e-health-goal-summary-user';

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
          `/health-goals/${userId}/summary`,
        )
        .expect(200);

    expect(
      response.body.data.status,
    ).toBe('AVAILABLE');

    expect(
      response.body.data.goalType,
    ).toBe('WEIGHT_LOSS');

    expect(
      response.body.data.currentWeightKg,
    ).toBe(72.5);

    expect(
      response.body.data.targetWeightKg,
    ).toBe(68);

    expect(
      response.body.data.progressPercent,
    ).toBe(35.7);

    expect(
      response.body.data.daysElapsed,
    ).toBeGreaterThanOrEqual(0);

    expect(
      response.body.data.daysRemaining,
    ).toBeGreaterThanOrEqual(0);

    expect(
      response.body.data.expectedProgressPercent,
    ).toBeGreaterThanOrEqual(0);

    expect([
      'AHEAD',
      'ON_TRACK',
      'BEHIND',
    ]).toContain(
      response.body.data.pace,
    );
  });


  it('ignores body weight recorded before goal start', async () => {
    const userId =
      'e2e-health-goal-pre-start-weight-user';

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
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          72,
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
    ).toBe('INSUFFICIENT_DATA');
  });

});
