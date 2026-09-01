import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BodyMetricsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createWeightRecord(
    input: {
      userId: string;
      weightKg: number;
      measuredAt: Date;
      note?: string;
    },
  ) {
    if (!input.userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    if (!input.weightKg) {
      throw new BadRequestException(
        'weightKg is required',
      );
    }

    return this.prisma.bodyMetricRecord.create({
      data: {
        userId: input.userId,
        weightKg: input.weightKg,
        measuredAt: input.measuredAt,
        note: input.note,
      },
    });
  }

  async getLatestWeight(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.bodyMetricRecord.findFirst({
      where: {
        userId,
      },
      orderBy: {
        measuredAt: 'desc',
      },
    });
  }

  async getHistory(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.bodyMetricRecord.findMany({
      where: {
        userId,
      },
      orderBy: {
        measuredAt: 'desc',
      },
    });
  }
}
