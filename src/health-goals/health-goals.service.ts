import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateHealthGoalInput {
  userId: string;
  goalType: string;
  startWeightKg?: number;
  targetWeightKg?: number;
  startDate: Date;
  targetDate?: Date;
}

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    input: CreateHealthGoalInput,
  ) {
    if (!input.userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.healthGoal.create({
      data: {
        userId: input.userId,
        goalType: input.goalType,
        startWeightKg:
          input.startWeightKg,
        targetWeightKg:
          input.targetWeightKg,
        startDate:
          input.startDate,
        targetDate:
          input.targetDate,
      },
    });
  }

  async getActive(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.healthGoal.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
