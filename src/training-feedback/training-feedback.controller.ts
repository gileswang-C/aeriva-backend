import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Get,
  Put,
} from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { TrainingFeedbackService } from './training-feedback.service';

class CreateFeedbackBody {
  @IsOptional()
  @IsInt()
  difficultyLevel?: number;

  @IsOptional()
  @IsInt()
  fatigueLevel?: number;

  @IsOptional()
  @IsInt()
  painLevel?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('training-feedback')
export class TrainingFeedbackController {
  constructor(
    private readonly trainingFeedbackService: TrainingFeedbackService,
  ) {}

  @Get(':sessionId/adjustment-detail')
  async getAdjustmentDetail(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingFeedbackService.getAdjustmentDetail(
          sessionId,
        ),
    };
  }


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


  @Put(':sessionId')
  async updateFeedback(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() body: CreateFeedbackBody,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingFeedbackService.updateFeedback(
          sessionId,
          body,
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
