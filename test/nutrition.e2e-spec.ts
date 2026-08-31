import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Nutrition (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

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

  it('records a meal and returns the correct daily nutrition summary', async () => {
    const userId =
      'e2e-nutrition-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'LUNCH',
          source: 'MANUAL',
          note: 'E2E nutrition test',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 260,
              proteinG: 5,
              carbsG: 57,
              fatG: 0.5,
              quantity: 200,
              unit: 'g',
            },
            {
              foodName: '鸡胸肉',
              caloriesKcal: 165,
              proteinG: 31,
              carbsG: 0,
              fatG: 3.6,
              quantity: 100,
              unit: 'g',
            },
            {
              foodName: '鸡蛋',
              caloriesKcal: 70,
              proteinG: 6,
              carbsG: 0.5,
              fatG: 5,
              quantity: 1,
              unit: '个',
            },
          ],
        })
        .expect(201);

    expect(
      createResponse.body.status,
    ).toBe('ok');

    expect(
      createResponse.body.data.items,
    ).toHaveLength(3);

    const todayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      todayResponse.body.data.meals,
    ).toHaveLength(1);

    expect(
      todayResponse.body.data.meals[0].items,
    ).toHaveLength(3);

    const summaryResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      summaryResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      summaryResponse.body.data.itemCount,
    ).toBe(3);

    expect(
      summaryResponse.body.data.totalCaloriesKcal,
    ).toBe(495);

    expect(
      summaryResponse.body.data.totalProteinG,
    ).toBe(42);

    expect(
      summaryResponse.body.data.totalCarbsG,
    ).toBe(57.5);

    expect(
      summaryResponse.body.data.totalFatG,
    ).toBe(9.1);
  });

  it('updates and deletes a meal while keeping the daily summary consistent', async () => {
    const userId =
      'e2e-nutrition-edit-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'LUNCH',
          source: 'MANUAL',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 260,
              proteinG: 5,
              carbsG: 57,
              fatG: 0.5,
            },
            {
              foodName: '鸡蛋',
              caloriesKcal: 70,
              proteinG: 6,
              carbsG: 0.5,
              fatG: 5,
            },
          ],
        })
        .expect(201);

    const mealLogId =
      createResponse.body.data.mealLogId;

    const updateResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/meals/${mealLogId}`,
        )
        .send({
          mealType: 'DINNER',
          note: 'updated meal',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 300,
              proteinG: 6,
              carbsG: 66,
              fatG: 1,
            },
            {
              foodName: '鸡胸肉',
              caloriesKcal: 200,
              proteinG: 38,
              carbsG: 0,
              fatG: 4,
            },
          ],
        })
        .expect(200);

    expect(
      updateResponse.body.data.mealLogId,
    ).toBe(mealLogId);

    expect(
      updateResponse.body.data.mealType,
    ).toBe('DINNER');

    expect(
      updateResponse.body.data.items,
    ).toHaveLength(2);

    const updatedSummary =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      updatedSummary.body.data.mealCount,
    ).toBe(1);

    expect(
      updatedSummary.body.data.itemCount,
    ).toBe(2);

    expect(
      updatedSummary.body.data.totalCaloriesKcal,
    ).toBe(500);

    expect(
      updatedSummary.body.data.totalProteinG,
    ).toBe(44);

    expect(
      updatedSummary.body.data.totalCarbsG,
    ).toBe(66);

    expect(
      updatedSummary.body.data.totalFatG,
    ).toBe(5);

    const deleteResponse =
      await request(app.getHttpServer())
        .delete(
          `/nutrition/meals/${mealLogId}`,
        )
        .expect(200);

    expect(
      deleteResponse.body.data,
    ).toEqual({
      mealLogId,
      deleted: true,
    });

    const todayAfterDelete =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      todayAfterDelete.body.data.meals,
    ).toHaveLength(0);

    const summaryAfterDelete =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      summaryAfterDelete.body.data.mealCount,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.itemCount,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalCaloriesKcal,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalProteinG,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalCarbsG,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalFatG,
    ).toBe(0);
  });
  it('supports historical date queries and rejects invalid dates', async () => {
    const userId =
      'e2e-nutrition-history-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'BREAKFAST',
          source: 'MANUAL',
          items: [
            {
              foodName: '燕麦',
              caloriesKcal: 228,
              proteinG: 8,
              carbsG: 40,
              fatG: 4,
            },
            {
              foodName: '牛奶',
              caloriesKcal: 150,
              proteinG: 8,
              carbsG: 12,
              fatG: 8,
            },
          ],
        })
        .expect(201);

    const localDate =
      createResponse.body.data.localDate;

    const dayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/${localDate}`,
        )
        .expect(200);

    expect(
      dayResponse.body.data.localDate,
    ).toBe(localDate);

    expect(
      dayResponse.body.data.meals,
    ).toHaveLength(1);

    expect(
      dayResponse.body.data.meals[0].items,
    ).toHaveLength(2);

    const summaryResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/${localDate}/summary`,
        )
        .expect(200);

    expect(
      summaryResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      summaryResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      summaryResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      summaryResponse.body.data.totalProteinG,
    ).toBe(16);

    expect(
      summaryResponse.body.data.totalCarbsG,
    ).toBe(52);

    expect(
      summaryResponse.body.data.totalFatG,
    ).toBe(12);

    const invalidDateResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/2026-02-30`,
        )
        .expect(400);

    expect(
      invalidDateResponse.body.message,
    ).toBe('localDate is invalid');
  });

  it('returns nutrition summaries for a date range and rejects reversed dates', async () => {
    const userId =
      'e2e-nutrition-range-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'BREAKFAST',
          source: 'MANUAL',
          items: [
            {
              foodName: '燕麦',
              caloriesKcal: 228,
              proteinG: 8,
              carbsG: 40,
              fatG: 4,
            },
            {
              foodName: '牛奶',
              caloriesKcal: 150,
              proteinG: 8,
              carbsG: 12,
              fatG: 8,
            },
          ],
        })
        .expect(201);

    const localDate =
      createResponse.body.data.localDate;

    const currentDate =
      new Date(
        `${localDate}T00:00:00.000Z`,
      );

    const previousDate =
      new Date(
        currentDate.getTime() -
          24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);

    const singleDayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${localDate}&endDate=${localDate}`,
        )
        .expect(200);

    expect(
      singleDayResponse.body.data.dayCount,
    ).toBe(1);

    expect(
      singleDayResponse.body.data.daysWithMeals,
    ).toBe(1);

    expect(
      singleDayResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      singleDayResponse.body.data.averageCaloriesKcalPerDay,
    ).toBe(378);

    const twoDayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${previousDate}&endDate=${localDate}`,
        )
        .expect(200);

    expect(
      twoDayResponse.body.data.dayCount,
    ).toBe(2);

    expect(
      twoDayResponse.body.data.daysWithMeals,
    ).toBe(1);

    expect(
      twoDayResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      twoDayResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      twoDayResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      twoDayResponse.body.data.totalProteinG,
    ).toBe(16);

    expect(
      twoDayResponse.body.data.totalCarbsG,
    ).toBe(52);

    expect(
      twoDayResponse.body.data.totalFatG,
    ).toBe(12);

    expect(
      twoDayResponse.body.data.averageCaloriesKcalPerDay,
    ).toBe(189);

    expect(
      twoDayResponse.body.data.averageProteinGPerDay,
    ).toBe(8);

    expect(
      twoDayResponse.body.data.averageCarbsGPerDay,
    ).toBe(26);

    expect(
      twoDayResponse.body.data.averageFatGPerDay,
    ).toBe(6);

    expect(
      twoDayResponse.body.data.dailySummaries,
    ).toHaveLength(1);

    expect(
      twoDayResponse.body.data.dailySummaries[0].localDate,
    ).toBe(localDate);

    const reversedResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${localDate}&endDate=${previousDate}`,
        )
        .expect(400);

    expect(
      reversedResponse.body.message,
    ).toBe(
      'startDate must not be after endDate',
    );
  });

  it('tracks daily nutrition target progress without creating duplicate targets', async () => {
    const userId =
      'e2e-nutrition-target-user';

    const firstTargetResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal: 2000,
          proteinG: 150,
          carbsG: 220,
          fatG: 60,
          source: 'MANUAL',
        })
        .expect(200);

    const targetId =
      firstTargetResponse.body.data
        .nutritionDailyTargetId;

    expect(
      firstTargetResponse.body.data.dailyCaloriesKcal,
    ).toBe(2000);

    const getTargetResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/target`,
        )
        .expect(200);

    expect(
      getTargetResponse.body.data
        .nutritionDailyTargetId,
    ).toBe(targetId);

    const updatedTargetResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal: 1800,
          proteinG: 160,
          carbsG: 180,
          fatG: 55,
          source: 'MANUAL',
        })
        .expect(200);

    expect(
      updatedTargetResponse.body.data
        .nutritionDailyTargetId,
    ).toBe(targetId);

    expect(
      updatedTargetResponse.body.data.dailyCaloriesKcal,
    ).toBe(1800);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId,
        mealType: 'LUNCH',
        source: 'MANUAL',
        items: [
          {
            foodName: '鸡胸肉',
            caloriesKcal: 330,
            proteinG: 62,
            carbsG: 0,
            fatG: 7.2,
          },
          {
            foodName: '米饭',
            caloriesKcal: 260,
            proteinG: 5,
            carbsG: 57,
            fatG: 0.5,
          },
        ],
      })
      .expect(201);

    const progressResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      progressResponse.body.data.calories,
    ).toEqual({
      target: 1800,
      consumed: 590,
      remaining: 1210,
      completionPercent: 32.8,
    });

    expect(
      progressResponse.body.data.protein,
    ).toEqual({
      target: 160,
      consumed: 67,
      remaining: 93,
      completionPercent: 41.9,
    });

    expect(
      progressResponse.body.data.carbs,
    ).toEqual({
      target: 180,
      consumed: 57,
      remaining: 123,
      completionPercent: 31.7,
    });

    expect(
      progressResponse.body.data.fat,
    ).toEqual({
      target: 55,
      consumed: 7.7,
      remaining: 47.3,
      completionPercent: 14,
    });

    expect(
      progressResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      progressResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      progressResponse.body.data.targetSource,
    ).toBe('MANUAL');
  });

  it('handles nutrition target and progress edge cases', async () => {
    const noTargetUserId =
      'e2e-nutrition-no-target-user';

    const noTargetResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${noTargetUserId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(404);

    expect(
      noTargetResponse.body.message,
    ).toBe(
      'Nutrition daily target not found',
    );

    const invalidTargetUserId =
      'e2e-nutrition-invalid-target-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${invalidTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 0,
        proteinG: 100,
        carbsG: 100,
        fatG: 50,
        source: 'MANUAL',
      })
      .expect(400);

    await request(app.getHttpServer())
      .put(
        `/nutrition/${invalidTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 1800,
        proteinG: -1,
        carbsG: 100,
        fatG: 50,
        source: 'MANUAL',
      })
      .expect(400);

    const overTargetUserId =
      'e2e-nutrition-over-target-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${overTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 500,
        proteinG: 40,
        carbsG: 50,
        fatG: 20,
        source: 'MANUAL',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId: overTargetUserId,
        mealType: 'DINNER',
        source: 'MANUAL',
        items: [
          {
            foodName: '测试餐',
            caloriesKcal: 600,
            proteinG: 50,
            carbsG: 60,
            fatG: 25,
          },
        ],
      })
      .expect(201);

    const progressResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${overTargetUserId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      progressResponse.body.data.calories,
    ).toEqual({
      target: 500,
      consumed: 600,
      remaining: -100,
      completionPercent: 120,
    });

    expect(
      progressResponse.body.data.protein,
    ).toEqual({
      target: 40,
      consumed: 50,
      remaining: -10,
      completionPercent: 125,
    });
  });

});
