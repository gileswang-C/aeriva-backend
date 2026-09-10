import { Injectable } from '@nestjs/common';

import {
  NutritionService,
} from '../../nutrition/nutrition.service';


@Injectable()
export class NutritionContextAdapter {

  constructor(
    private readonly nutritionService: NutritionService,
  ) {}


  async build(
    userId: string,
  ) {

    try {

      const target =
        await this.nutritionService.getDailyTarget(
          userId,
        );


      return {
        dailyCaloriesKcal:
          target.dailyCaloriesKcal,

        calorieGap:
          0,
      };

    } catch {

      return undefined;

    }
  }
}
