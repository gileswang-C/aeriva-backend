import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}