import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Body Metrics (e2e)', () => {
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

  it('creates weight record and returns latest weight and history', async () => {
    const userId =
      'e2e-body-metrics-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/body-metrics/weight',
        )
        .send({
          userId,
          weightKg: 72.5,
          measuredAt:
            '2026-09-01T08:00:00.000Z',
          note:
            'morning weight',
        })
        .expect(201);

    expect(
      createResponse.body.data.weightKg,
    ).toBe(72.5);

    expect(
      createResponse.body.data.userId,
    ).toBe(userId);

    const latestResponse =
      await request(app.getHttpServer())
        .get(
          `/body-metrics/${userId}/latest-weight`,
        )
        .expect(200);

    expect(
      latestResponse.body.data.weightKg,
    ).toBe(72.5);

    const historyResponse =
      await request(app.getHttpServer())
        .get(
          `/body-metrics/${userId}/history`,
        )
        .expect(200);

    expect(
      historyResponse.body.data,
    ).toHaveLength(1);
  });

  it('keeps weight records isolated by user', async () => {
    const userA =
      'e2e-body-metrics-user-a';

    const userB =
      'e2e-body-metrics-user-b';

    await request(app.getHttpServer())
      .post(
        '/body-metrics/weight',
      )
      .send({
        userId: userA,
        weightKg: 70,
        measuredAt:
          '2026-09-01T08:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        '/body-metrics/weight',
      )
      .send({
        userId: userB,
        weightKg: 80,
        measuredAt:
          '2026-09-01T08:00:00.000Z',
      })
      .expect(201);

    const response =
      await request(app.getHttpServer())
        .get(
          `/body-metrics/${userA}/history`,
        )
        .expect(200);

    expect(
      response.body.data,
    ).toHaveLength(1);

    expect(
      response.body.data[0].weightKg,
    ).toBe(70);
  });
});
