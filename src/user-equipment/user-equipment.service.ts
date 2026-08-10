import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserEquipmentDetail {
  id: number;
  name: string;
  category: string;
}

export interface UserEquipmentProfile {
  userId: string;
  homeEquipmentIds: number[];
  gymEquipmentIds: number[];
  homeEquipment: UserEquipmentDetail[];
  gymEquipment: UserEquipmentDetail[];
  updatedAt: string | null;
}

@Injectable()
export class UserEquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
  ): Promise<UserEquipmentProfile> {
    const records = await this.prisma.userEquipment.findMany({
      where: {
        userId,
      },
      include: {
        equipment: true,
      },
      orderBy: {
        equipmentId: 'asc',
      },
    });

    const homeRecords = records.filter(
      (record) => record.environment === 'HOME',
    );

    const gymRecords = records.filter(
      (record) => record.environment === 'GYM',
    );

    const homeEquipmentIds = [
      ...new Set(
        homeRecords.map((record) => record.equipmentId),
      ),
    ];

    const gymEquipmentIds = [
      ...new Set(
        gymRecords.map((record) => record.equipmentId),
      ),
    ];

    const homeEquipment = homeRecords.map((record) => ({
      id: record.equipment.id,
      name: record.equipment.name,
      category: record.equipment.category,
    }));

    const gymEquipment = gymRecords.map((record) => ({
      id: record.equipment.id,
      name: record.equipment.name,
      category: record.equipment.category,
    }));

    const latestUpdatedAt =
      records.length > 0
        ? new Date(
            Math.max(
              ...records.map((record) =>
                record.updatedAt.getTime(),
              ),
            ),
          ).toISOString()
        : null;

    return {
      userId,
      homeEquipmentIds,
      gymEquipmentIds,
      homeEquipment,
      gymEquipment,
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

    const allEquipmentIds = [
      ...new Set([...uniqueHomeIds, ...uniqueGymIds]),
    ];

    if (allEquipmentIds.length > 0) {
      const existingEquipment =
        await this.prisma.equipment.findMany({
          where: {
            id: {
              in: allEquipmentIds,
            },
          },
          select: {
            id: true,
            supportsHome: true,
            supportsGym: true,
          },
        });

      const equipmentById = new Map(
        existingEquipment.map((item) => [item.id, item]),
      );

      const invalidIds = allEquipmentIds.filter(
        (id) => !equipmentById.has(id),
      );

      if (invalidIds.length > 0) {
        throw new BadRequestException(
          `Equipment IDs not found: ${invalidIds.join(', ')}`,
        );
      }

      const invalidHomeIds = uniqueHomeIds.filter(
        (id) => !equipmentById.get(id)?.supportsHome,
      );

      if (invalidHomeIds.length > 0) {
        throw new BadRequestException(
          `Equipment IDs not supported for HOME: ${invalidHomeIds.join(', ')}`,
        );
      }

      const invalidGymIds = uniqueGymIds.filter(
        (id) => !equipmentById.get(id)?.supportsGym,
      );

      if (invalidGymIds.length > 0) {
        throw new BadRequestException(
          `Equipment IDs not supported for GYM: ${invalidGymIds.join(', ')}`,
        );
      }
    }

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