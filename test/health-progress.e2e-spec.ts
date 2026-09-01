import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Health Progress (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

    prisma =
      moduleFixture.get(
        PrismaService,
      );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns insufficient data for empty user', async () => {
    const response =
      await request(app.getHttpServer())
        .get(
          '/health-progress/e2e-empty-user/weekly-summary?utcOffsetMinutes=480',
        )
        .expect(200);

    expect(
      response.body.data.weight.status,
    ).toBe('NO_DATA');

    expect(
      response.body.data.training.status,
    ).toBe('NO_DATA');

    expect(
      response.body.data.training.consistency,
    ).toBe('NO_DATA');

    expect(
      response.body.data.overallStatus,
    ).toBe('INSUFFICIENT_DATA');
  });

  it('aggregates weight, nutrition and training progress', async () => {
    const userId =
      'e2e-health-progress-user';

    await request(app.getHttpServer())
      .post(
        '/body-metrics/weight',
      )
      .send({
        userId,
        weightKg: 73.5,
        measuredAt:
          '2026-08-27T08:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        '/body-metrics/weight',
      )
      .send({
        userId,
        weightKg: 72.5,
        measuredAt:
          '2026-09-01T08:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId,
        mealType:
          'LUNCH',
        source:
          'MANUAL',
        items: [
          {
            foodName:
              'Chicken',
            caloriesKcal: 500,
            proteinG: 40,
          },
        ],
      })
      .expect(201);

    const plan =
      await prisma.trainingPlan.create({
        data: {
          userId,
          environment:
            'GYM',
          targetMuscle:
            'FULL_BODY',
        },
      });

    await prisma.trainingSession.create({
      data: {
        userId,
        planId:
          plan.id,
        status:
          'COMPLETED',
        startedAt:
          new Date(
            '2026-08-29T08:00:00.000Z',
          ),
      },
    });

    await prisma.trainingSession.create({
      data: {
        userId,
        planId:
          plan.id,
        status:
          'COMPLETED',
        startedAt:
          new Date(
            '2026-08-30T08:00:00.000Z',
          ),
      },
    });

    await prisma.trainingSession.create({
      data: {
        userId,
        planId:
          plan.id,
        status:
          'COMPLETED',
        startedAt:
          new Date(
            '2026-09-01T08:00:00.000Z',
          ),
      },
    });

    const response =
      await request(app.getHttpServer())
        .get(
          `/health-progress/${userId}/weekly-summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      response.body.data.weight.status,
    ).toBe('AVAILABLE');

    expect(
      response.body.data.weight.trend,
    ).toBe('DOWN');

    expect(
      response.body.data.training.status,
    ).toBe('AVAILABLE');

    expect(
      response.body.data.training.trainingDays,
    ).toBe(3);

    expect(
      response.body.data.overallStatus,
    ).toBe('PROGRESSING');
  });
});
