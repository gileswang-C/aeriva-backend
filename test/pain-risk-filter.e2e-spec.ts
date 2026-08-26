import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Pain Risk Filter (e2e)', () => {
  let app: INestApplication<App>;

  const userId = 'e2e-pain-risk-user';

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

  it('filters blocked exercises from the adaptive plan and reports them', async () => {
    await request(app.getHttpServer())
      .put(`/user-equipment/${userId}`)
      .send({
        homeEquipmentIds: [],
        gymEquipmentIds: [3, 4],
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
        painAreas: ['腰部'],
        note: 'E2E pain risk filter test',
      })
      .expect(200);

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

    expect(
      response.body.data.readiness
        .readinessStatus,
    ).toBe('AVOID_PAIN_AREA');

    expect(
      response.body.data.adaptationType,
    ).toBe('PAIN_PROTECTION');

    const plan = response.body.data.plan;

    expect(plan).not.toBeNull();

    const exerciseIds =
      plan.exercises.map(
        (exercise: {
          exerciseId: number;
        }) => exercise.exerciseId,
      );

    expect(exerciseIds).toContain(3);
    expect(exerciseIds).not.toContain(5);

    const blockedExercises =
      plan.painRiskSummary
        .blockedExercises;

    expect(
      plan.painRiskSummary.blockedCount,
    ).toBe(1);

    const blockedRow =
      blockedExercises.find(
        (exercise: {
          exerciseId: number;
        }) =>
          exercise.exerciseId === 5,
      );

    expect(blockedRow).toBeDefined();
    expect(blockedRow.risk).toBe('HIGH');

    expect(
      blockedRow.exerciseName,
    ).toBe('弹力带划船');
  });
});
