import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';

interface StartTrainingSessionBody {
  userId: string;
  planId: number;
}

interface LogTrainingSetBody {
  exerciseId: number;
  setNumber: number;
  reps: number;
  weightKg?: number;
}

@Controller('training-sessions')
export class TrainingSessionsController {
  constructor(
    private readonly trainingSessionsService: TrainingSessionsService,
  ) {}

  @Post('start')
  async start(
    @Body() body: StartTrainingSessionBody,
  ) {
    const {
      userId,
      planId,
    } = body;

    if (!userId) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    if (!planId) {
      throw new BadRequestException(
        'planId is required',
      );
    }

    return {
      status: 'ok',
      data: await this.trainingSessionsService.start(
        userId,
        planId,
      ),
    };
  }

  @Post(':sessionId/sets')
  async logSet(
    @Param('sessionId', ParseIntPipe)
    sessionId: number,
    @Body() body: LogTrainingSetBody,
  ) {
    const {
      exerciseId,
      setNumber,
      reps,
      weightKg,
    } = body;

    if (!exerciseId) {
      throw new BadRequestException(
        'exerciseId is required',
      );
    }

    if (!setNumber) {
      throw new BadRequestException(
        'setNumber is required',
      );
    }

    if (
      reps === undefined ||
      reps === null
    ) {
      throw new BadRequestException(
        'reps is required',
      );
    }

    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.logSet(
          sessionId,
          exerciseId,
          setNumber,
          reps,
          weightKg,
        ),
    };
  }

  @Post(':sessionId/complete')
  async complete(
    @Param('sessionId', ParseIntPipe)
    sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.complete(
          sessionId,
        ),
    };
  }

  @Post(':sessionId/cancel')
  async cancel(
    @Param('sessionId', ParseIntPipe)
    sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.cancel(
          sessionId,
        ),
    };
  }

  @Get('history/:userId/:exerciseId')
  async findExerciseHistory(
    @Param('userId') userId: string,
    @Param('exerciseId', ParseIntPipe)
    exerciseId: number,
    @Query('limit') limit?: string,
  ) {
    let parsedLimit = 5;

    if (limit !== undefined) {
      parsedLimit = Number(limit);

      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit < 1
      ) {
        throw new BadRequestException(
          'limit must be a positive integer',
        );
      }
    }

    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.findExerciseHistory(
          userId,
          exerciseId,
          parsedLimit,
        ),
    };
  }

  @Get(':sessionId/analysis')
  async analyze(
    @Param('sessionId', ParseIntPipe)
    sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.analyze(
          sessionId,
        ),
    };
  }

  @Get(':sessionId')
  async findById(
    @Param('sessionId', ParseIntPipe)
    sessionId: number,
  ) {
    return {
      status: 'ok',
      data:
        await this.trainingSessionsService.findById(
          sessionId,
        ),
    };
  }
}