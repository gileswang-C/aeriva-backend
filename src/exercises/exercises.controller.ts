import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  ExerciseEnvironment,
  ExercisesService,
} from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
  ) {}

  @Get()
  async findAll() {
    return {
      status: 'ok',
      data: await this.exercisesService.findAll(),
    };
  }

  @Get('available')
  async findAvailable(
    @Query('userId') userId?: string,
    @Query('environment') environment?: string,
    @Query('targetMuscle') targetMuscle?: string,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
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
      userId,
      environment: normalizedEnvironment,
      targetMuscle: targetMuscle ?? null,
      data: await this.exercisesService.findAvailableForUser(
        userId,
        normalizedEnvironment as ExerciseEnvironment,
        targetMuscle,
      ),
    };
  }
}