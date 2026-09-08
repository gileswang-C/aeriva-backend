import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { HealthGoalsService } from './health-goals.service';

@Controller('health-goals')
export class HealthGoalsController {
  constructor(
    private readonly healthGoalsService: HealthGoalsService,
  ) {}

  @Post()
  async create(
    @Body()
    body: {
      userId: string;
      goalType: string;
      startWeightKg?: number;
      targetWeightKg?: number;
      startDate: string;
      targetDate?: string;
    },
  ) {
    return {
      status: 'ok',
      data:
        await this.healthGoalsService.create({
          userId: body.userId,
          goalType: body.goalType,
          startWeightKg:
            body.startWeightKg,
          targetWeightKg:
            body.targetWeightKg,
          startDate:
            new Date(body.startDate),
          targetDate:
            body.targetDate
              ? new Date(body.targetDate)
              : undefined,
        }),
    };
  }

  @Post(':goalId/complete')
  async completeGoal(
    @Param('goalId')
    goalId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.healthGoalsService.completeGoal(
          Number(goalId),
        ),
    };
  }

  @Post(':goalId/cancel')
  async cancelGoal(
    @Param('goalId')
    goalId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.healthGoalsService.cancelGoal(
          Number(goalId),
        ),
    };
  }

  @Get(':userId/active')
  async getActive(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.healthGoalsService.getActive(
          userId,
        ),
    };
  }

  @Get(':userId/progress')
  async getProgress(
    @Param('userId')
    userId: string,
  ) {
    return {
      status: 'ok',
      data:
        await this.healthGoalsService.getProgress(
          userId,
        ),
    };
  }

}
