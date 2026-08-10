import { Controller, Get } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

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
}