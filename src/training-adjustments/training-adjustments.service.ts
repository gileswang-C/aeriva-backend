import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getLatestByUserId(
    userId: string,
  ) {
    const latest =
      await this.prisma.trainingAdjustment.findFirst({
        where: {
          userId,
        },
        orderBy: [
          {
            session: {
              completedAt: 'desc',
            },
          },
          {
            sessionId: 'desc',
          },
        ],
      });

    if (!latest) {
      return {
        userId,
        adjustments: [],
      };
    }

    const adjustments =
      await this.prisma.trainingAdjustment.findMany({
        where: {
          userId,
          sessionId:
            latest.sessionId,
        },
        orderBy: {
          id: 'asc',
        },
      });

    return {
      userId,
      sessionId:
        latest.sessionId,
      adjustments,
    };
  }
}
