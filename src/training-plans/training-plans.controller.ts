import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ExerciseEnvironment } from '../exercises/exercises.service';
import { TrainingPlansService } from './training-plans.service';

interface GenerateTrainingPlanBody {
  userId: string;
  environment: string;
  targetMuscle: string;
}

@Controller('training-plans')
export class TrainingPlansController {
  constructor(
    private readonly trainingPlansService: TrainingPlansService,
  ) {}

  @Post('generate')
  async generate(
    @Body() body: GenerateTrainingPlanBody,
  ) {
    const {
      userId,
      environment,
      targetMuscle,
    } = body;

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!targetMuscle) {
      throw new BadRequestException(
        'targetMuscle is required',
      );
    }

    const normalizedEnvironment =
      environment?.toUpperCase();

    if (
      normalizedEnvironment !== 'HOME' &&
      normalizedEnvironment !== 'GYM'
    ) {
      throw new BadRequestException(
        'environment must be HOME or GYM',
      );
    }

    return {
      status: 'ok',
      data: await this.trainingPlansService.generate(
        userId,
        normalizedEnvironment as ExerciseEnvironment,
        targetMuscle,
      ),
    };
  }

  @Get(':planId')
  async findById(
    @Param('planId', ParseIntPipe) planId: number,
  ) {
    return {
      status: 'ok',
      data: await this.trainingPlansService.findById(planId),
    };
  }
}