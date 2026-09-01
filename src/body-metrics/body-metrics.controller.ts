import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { BodyMetricsService } from './body-metrics.service';

@Controller('body-metrics')
export class BodyMetricsController {
  constructor(
    private readonly bodyMetricsService: BodyMetricsService,
  ) {}

  @Post('weight')
  async createWeight(
    @Body()
    body: {
      userId: string;
      weightKg: number;
      measuredAt: string;
      note?: string;
    },
  ) {
    return {
      status: 'ok',
      data:
        await this.bodyMetricsService.createWeightRecord(
          {
            userId: body.userId,
            weightKg: body.weightKg,
            measuredAt:
              new Date(body.measuredAt),
            note: body.note,
          },
        ),
    };
  }

  @Get(':userId/latest-weight')
  async getLatestWeight(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.bodyMetricsService.getLatestWeight(
          userId,
        ),
    };
  }

  @Get(':userId/history')
  async getHistory(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.bodyMetricsService.getHistory(
          userId,
        ),
    };
  }
}
