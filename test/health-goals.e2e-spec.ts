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

});
