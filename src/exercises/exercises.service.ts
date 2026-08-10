import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ExerciseEnvironment = 'HOME' | 'GYM';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.exercise.findMany({
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findAvailableForUser(
    userId: string,
    environment: ExerciseEnvironment,
    targetMuscle?: string,
  ) {
    const userEquipment =
      await this.prisma.userEquipment.findMany({
        where: {
          userId,
          environment,
        },
        select: {
          equipmentId: true,
        },
      });

    const equipmentIds = userEquipment.map(
      (item) => item.equipmentId,
    );

    return this.prisma.exercise.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                equipmentId: null,
              },
              {
                equipmentId: {
                  in: equipmentIds,
                },
              },
            ],
          },
          ...(targetMuscle
            ? [
                {
                  targetMuscle,
                },
              ]
            : []),
        ],
      },
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }
}