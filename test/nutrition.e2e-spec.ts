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

});
