import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ExerciseEnvironment,
} from '../exercises/exercises.service';
import { TrainingPlansService } from './training-plans.service';

@Controller('training-plans')
export class TrainingPlansController {
  constructor(
    private readonly trainingPlansService: TrainingPlansService,
  ) {}

  @Get('generate')
  async generate(
    @Query('userId') userId?: string,
    @Query('environment') environment?: string,
    @Query('targetMuscle') targetMuscle?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!targetMuscle) {
      throw new BadRequestException(
        'targetMuscle is required',
      );
    }

    const normalizedEnvironment = environment?.toUpperCase();

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
}