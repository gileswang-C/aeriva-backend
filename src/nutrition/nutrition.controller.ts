import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NutritionService } from './nutrition.service';

class MealItemBody {
  @IsString()
  @IsNotEmpty()
  foodName!: string;

  @IsNumber()
  @Min(0)
  caloriesKcal!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

class CreateMealBody {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientRequestId?: string;

  @IsString()
  @IsIn([
    'BREAKFAST',
    'LUNCH',
    'DINNER',
    'SNACK',
    'LATE_NIGHT',
  ])
  mealType!: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'MANUAL',
    'PHOTO_AI',
  ])
  source?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => MealItemBody)
  items!: MealItemBody[];
}

class UpdateMealBody {
  @IsOptional()
  @IsString()
  @IsIn([
    'BREAKFAST',
    'LUNCH',
    'DINNER',
    'SNACK',
    'LATE_NIGHT',
  ])
  mealType?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'MANUAL',
    'PHOTO_AI',
  ])
  source?: string;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => MealItemBody)
  items?: MealItemBody[];
}

class UpsertNutritionTargetBody {
  @IsNumber()
  @Min(1)
  dailyCaloriesKcal!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbsG?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatG?: number;

  @IsOptional()
  @IsString()
  @IsIn([
    'MANUAL',
    'AI',
  ])
  source?: string;
}

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly nutritionService:
      NutritionService,
  ) {}

  @Put(':userId/target')
  async upsertDailyTarget(
    @Param('userId')
    userId: string,
    @Body()
    body: UpsertNutritionTargetBody,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.upsertDailyTarget(
          userId,
          body,
        ),
    };
  }

  @Get(':userId/target')
  async getDailyTarget(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.getDailyTarget(
          userId,
        ),
    };
  }

  @Post('meals')
  async createMeal(
    @Body()
    body: CreateMealBody,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.nutritionService.createMeal(
          body,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  @Put('meals/:mealLogId')
  async updateMeal(
    @Param(
      'mealLogId',
      ParseIntPipe,
    )
    mealLogId: number,
    @Body()
    body: UpdateMealBody,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.updateMeal(
          mealLogId,
          body,
        ),
    };
  }

  @Delete('meals/:mealLogId')
  async deleteMeal(
    @Param(
      'mealLogId',
      ParseIntPipe,
    )
    mealLogId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.deleteMeal(
          mealLogId,
        ),
    };
  }

  @Get(':userId/range/summary')
  async getRangeSummary(
    @Param('userId')
    userId: string,
    @Query('startDate')
    startDate?: string,
    @Query('endDate')
    endDate?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate are required',
      );
    }

    return {
      status: 'ok',
      data:
        await this.nutritionService.getRangeSummary(
          userId,
          startDate,
          endDate,
        ),
    };
  }

  @Get(':userId/date/:localDate/summary')
  async getSummaryByDate(
    @Param('userId')
    userId: string,
    @Param('localDate')
    localDate: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.getSummaryByDate(
          userId,
          localDate,
        ),
    };
  }

  @Get(':userId/date/:localDate')
  async getByDate(
    @Param('userId')
    userId: string,
    @Param('localDate')
    localDate: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.nutritionService.getByDate(
          userId,
          localDate,
        ),
    };
  }

  @Get(':userId/today/progress')
  async getTodayProgress(
    @Param('userId')
    userId: string,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.nutritionService.getTodayProgress(
          userId,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  @Get(':userId/today/summary')
  async getTodaySummary(
    @Param('userId')
    userId: string,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.nutritionService.getTodaySummary(
          userId,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  @Get(':userId/today')
  async getToday(
    @Param('userId')
    userId: string,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.nutritionService.getToday(
          userId,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  private parseUtcOffsetMinutes(
    value?: string,
  ) {
    if (value === undefined) {
      return 480;
    }

    const parsed =
      Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < -720 ||
      parsed > 840
    ) {
      throw new BadRequestException(
        'utcOffsetMinutes must be an integer between -720 and 840',
      );
    }

    return parsed;
  }
}
