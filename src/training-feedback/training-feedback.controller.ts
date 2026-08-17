import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Get,
} from '@nestjs/common';
import { TrainingFeedbackService } from './training-feedback.service';

interface CreateFeedbackBody {
  difficultyLevel?: number;
  fatigueLevel?: number;
  painLevel?: number;
  note?: string;
}

@Controller('training-feedback')
export class TrainingFeedbackController {
  constructor(
    private readonly trainingFeedbackService: TrainingFeedbackService,
  ) {}

  @Get(':sessionId/adjustment')
  async getAdjustment(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingFeedbackService.getAdjustment(
          sessionId,
        ),
    };
  }


  @Get(':sessionId')
  async getFeedback(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingFeedbackService.getFeedback(
          sessionId,
        ),
    };
  }


  @Post(':sessionId')
  async createFeedback(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: CreateFeedbackBody,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingFeedbackService.createFeedback(
          sessionId,
          body,
        ),
    };
  }
}
