import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserEquipmentProfile {
  userId: string;
  homeEquipmentIds: number[];
  gymEquipmentIds: number[];
  updatedAt: string | null;
}

@Injectable()
export class UserEquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserEquipmentProfile> {
    const records = await this.prisma.userEquipment.findMany({
      where: {
        userId,
      },
      orderBy: {
        equipmentId: 'asc',
      },
    });

    const homeEquipmentIds = [
      ...new Set(
        records
          .filter((record) => record.environment === 'HOME')
          .map((record) => record.equipmentId),
      ),
    ];

    const gymEquipmentIds = [
      ...new Set(
        records
          .filter((record) => record.environment === 'GYM')
          .map((record) => record.equipmentId),
      ),
    ];

    const latestUpdatedAt =
      records.length > 0
        ? new Date(
            Math.max(
              ...records.map((record) => record.updatedAt.getTime()),
            ),
          ).toISOString()
        : null;

    return {
      userId,
      homeEquipmentIds,
      gymEquipmentIds,
      updatedAt: latestUpdatedAt,
    };
  }

  async update(
    userId: string,
    homeEquipmentIds: number[],
    gymEquipmentIds: number[],
  ): Promise<UserEquipmentProfile> {
    const uniqueHomeIds = [...new Set(homeEquipmentIds)];
    const uniqueGymIds = [...new Set(gymEquipmentIds)];

    const data = [
      ...uniqueHomeIds.map((equipmentId) => ({
        userId,
        equipmentId,
        environment: 'HOME',
      })),
      ...uniqueGymIds.map((equipmentId) => ({
        userId,
        equipmentId,
        environment: 'GYM',
      })),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.userEquipment.deleteMany({
        where: {
          userId,
        },
      });

      if (data.length > 0) {
        await tx.userEquipment.createMany({
          data,
        });
      }
    });

    return this.findByUserId(userId);
  }
}