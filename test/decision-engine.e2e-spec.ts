
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Decision Engine (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef =
      await Test.createTestingModule({
        imports: [
          AppModule,
        ],
      }).compile();

    app =
      moduleRef.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });


  it('returns create goal decision when user has no goal', async () => {
    const userId =
      'e2e-decision-no-goal-user';

    const response =
      await request(app.getHttpServer())
        .get(
          `/decision/${userId}`,
        )
        .expect(200);

    expect(
      response.body.data.decision.type,
    ).toBe('CREATE_GOAL');
  });


  it('returns continue decision when goal progress is healthy', async () => {
    const userId =
      'e2e-decision-continue-user';

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
          `/decision/${userId}`,
        )
        .expect(200);

    expect(
      response.body.data.decision.type,
    ).toBe('CONTINUE');
  });


  it('returns adjustment decision when goal progress is behind', async () => {
    const userId =
      'e2e-decision-adjust-user';

    await request(app.getHttpServer())
      .post('/health-goals')
      .send({
        userId,
        goalType:
          'WEIGHT_LOSS',
        startWeightKg:
          80,
        targetWeightKg:
          70,
        startDate:
          '2026-08-01T00:00:00.000Z',
        targetDate:
          '2026-09-01T00:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/body-metrics/weight')
      .send({
        userId,
        weightKg:
          79,
        measuredAt:
          '2026-08-28T08:00:00.000Z',
      })
      .expect(201);

    const response =
      await request(app.getHttpServer())
        .get(
          `/decision/${userId}`,
        )
        .expect(200);

    expect(
      response.body.data.decision.type,
    ).toBe('ADJUST_NUTRITION');
  });
});
