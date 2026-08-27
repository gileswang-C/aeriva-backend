import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
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

class CreateMealItemBody {
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
  @Type(() =>
    CreateMealItemBody
  )
  items!: CreateMealItemBody[];
}

@Controller('nutrition')
export class NutritionController {
  constructor(
    private readonly nutritionService:
      NutritionService,
  ) {}

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
