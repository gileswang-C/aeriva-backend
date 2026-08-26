import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Readiness Gate (e2e)', () => {
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

  async function setGymEquipment(
    userId: string,
  ) {
    await request(app.getHttpServer())
      .put(`/user-equipment/${userId}`)
      .send({
        homeEquipmentIds: [],
        gymEquipmentIds: [3],
      })
      .expect(200);
  }

  async function generateAdaptive(
    userId: string,
  ) {
    return request(app.getHttpServer())
      .post(
        '/training-plans/generate-adaptive?utcOffsetMinutes=480',
      )
      .send({
        userId,
        environment: 'GYM',
        targetMuscle: '背部',
      })
      .expect(201);
  }

  it('blocks adaptive plan generation when body state is missing', async () => {
    const userId = 'e2e-readiness-no-data';

    await setGymEquipment(userId);

    const response =
      await generateAdaptive(userId);

    expect(
      response.body.data.readiness
        .readinessStatus,
    ).toBe('NO_DATA');

    expect(
      response.body.data.adaptationType,
    ).toBe('NO_DATA');

    expect(
      response.body.data.plan,
    ).toBeNull();
  });

  it('blocks formal training when readiness requires recovery', async () => {
    const userId = 'e2e-readiness-recovery';

    await setGymEquipment(userId);

    await request(app.getHttpServer())
      .put(
        `/body-state/${userId}/today?utcOffsetMinutes=480`,
      )
      .send({
        sleepHours: 4,
        sleepQuality: 1,
        energyLevel: 1,
        sorenessLevel: 5,
        stressLevel: 5,
        painAreas: [],
        note: 'E2E recovery gate',
      })
      .expect(200);

    const response =
      await generateAdaptive(userId);

    expect(
      response.body.data.readiness
        .readinessStatus,
    ).toBe('RECOVERY');

    expect(
      response.body.data.adaptationType,
    ).toBe('RECOVERY');

    expect(
      response.body.data.plan,
    ).toBeNull();
  });

  it('uses pain protection when pain areas are present', async () => {
    const userId = 'e2e-readiness-pain';

    await setGymEquipment(userId);

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
        painAreas: ['肩部'],
        note: 'E2E pain protection gate',
      })
      .expect(200);

    const response =
      await generateAdaptive(userId);

    expect(
      response.body.data.readiness
        .readinessStatus,
    ).toBe('AVOID_PAIN_AREA');

    expect(
      response.body.data.adaptationType,
    ).toBe('PAIN_PROTECTION');

    expect(
      response.body.data.plan,
    ).not.toBeNull();
  });

  it('reduces training intensity when readiness is below normal', async () => {
    const userId =
      'e2e-readiness-reduced-intensity';

    await setGymEquipment(userId);

    await request(app.getHttpServer())
      .put(
        `/body-state/${userId}/today?utcOffsetMinutes=480`,
      )
      .send({
        sleepHours: 6.5,
        sleepQuality: 3,
        energyLevel: 3,
        sorenessLevel: 3,
        stressLevel: 3,
        painAreas: [],
        note: 'E2E reduced intensity gate',
      })
      .expect(200);

    const response =
      await generateAdaptive(userId);

    expect(
      response.body.data.readiness
        .readinessStatus,
    ).toBe('REDUCE_INTENSITY');

    expect(
      response.body.data.adaptationType,
    ).toBe('REDUCED_INTENSITY');

    expect(
      response.body.data.plan,
    ).not.toBeNull();

    for (
      const exercise
      of response.body.data.plan.exercises
    ) {
      expect(exercise.sets).toBe(2);
    }
  });
});
