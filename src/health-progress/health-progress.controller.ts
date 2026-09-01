import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { HealthProgressService } from './health-progress.service';

@Controller('health-progress')
export class HealthProgressController {
  constructor(
    private readonly healthProgressService: HealthProgressService,
  ) {}

  @Get(':userId/weekly-summary')
  async getWeeklySummary(
    @Param('userId')
    userId: string,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    const parsedOffset =
      utcOffsetMinutes
        ? Number(utcOffsetMinutes)
        : 480;

    return {
      status: 'ok',
      data:
        await this.healthProgressService.getWeeklySummary(
          userId,
          parsedOffset,
        ),
    };
  }
}
