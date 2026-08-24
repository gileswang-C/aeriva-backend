import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { TrainingAdjustmentsService } from './training-adjustments.service';

@Controller('training-adjustments')
export class TrainingAdjustmentsController {
  constructor(
    private readonly trainingAdjustmentsService: TrainingAdjustmentsService,
  ) {}

  @Get('latest/:userId')
  async getLatest(
    @Param('userId') userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingAdjustmentsService.getLatestByUserId(
          userId,
        ),
    };
  }
}
