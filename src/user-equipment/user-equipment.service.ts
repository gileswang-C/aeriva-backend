import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
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

  async findByUserId(
    userId: string,
  ): Promise<UserEquipmentProfile> {
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