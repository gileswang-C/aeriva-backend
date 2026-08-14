import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UpsertBodyStateInput {
  sleepHours?: number;
  sleepQuality?: number;
  energyLevel?: number;
  sorenessLevel?: number;
  stressLevel?: number;
  painAreas?: string[];
  note?: string;
}

@Injectable()
export class BodyStateService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async upsertToday(
    userId: string,
    input: UpsertBodyStateInput,
    utcOffsetMinutes = 480,
  ) {
    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const updateData: {
      utcOffsetMinutes: number;
      sleepHours?: number;
      sleepQuality?: number;
      energyLevel?: number;
      sorenessLevel?: number;
      stressLevel?: number;
      painAreasJson?: string;
      note?: string;
    } = {
      utcOffsetMinutes,
    };

    if (
      input.sleepHours !== undefined
    ) {
      updateData.sleepHours =
        input.sleepHours;
    }

    if (
      input.sleepQuality !== undefined
    ) {
      updateData.sleepQuality =
        input.sleepQuality;
    }

    if (
      input.energyLevel !== undefined
    ) {
      updateData.energyLevel =
        input.energyLevel;
    }

    if (
      input.sorenessLevel !== undefined
    ) {
      updateData.sorenessLevel =
        input.sorenessLevel;
    }

    if (
      input.stressLevel !== undefined
    ) {
      updateData.stressLevel =
        input.stressLevel;
    }

    if (
      input.painAreas !== undefined
    ) {
      updateData.painAreasJson =
        JSON.stringify(
          input.painAreas,
        );
    }

    if (
      input.note !== undefined
    ) {
      updateData.note = input.note;
    }

    const record =
      await this.prisma.dailyBodyState.upsert(
        {
          where: {
            userId_localDate: {
              userId,
              localDate,
            },
          },
          create: {
            userId,
            localDate,
            ...updateData,
          },
          update: updateData,
        },
      );

    return this.mapRecord(record);
  }

  async findToday(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const record =
      await this.prisma.dailyBodyState.findUnique(
        {
          where: {
            userId_localDate: {
              userId,
              localDate,
            },
          },
        },
      );

    if (!record) {
      return null;
    }

    return this.mapRecord(record);
  }

  private getLocalDate(
    utcOffsetMinutes: number,
  ) {
    const shiftedDate =
      new Date(
        Date.now() +
          utcOffsetMinutes *
            60 *
            1000,
      );

    const year =
      shiftedDate.getUTCFullYear();

    const month = String(
      shiftedDate.getUTCMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      shiftedDate.getUTCDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private mapRecord(
    record: {
      id: number;
      userId: string;
      localDate: string;
      utcOffsetMinutes: number;
      sleepHours: number | null;
      sleepQuality: number | null;
      energyLevel: number | null;
      sorenessLevel: number | null;
      stressLevel: number | null;
      painAreasJson: string | null;
      note: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    let painAreas: string[] = [];

    if (record.painAreasJson) {
      try {
        const parsed =
          JSON.parse(
            record.painAreasJson,
          );

        if (Array.isArray(parsed)) {
          painAreas = parsed;
        }
      } catch {
        painAreas = [];
      }
    }

    return {
      id: record.id,
      userId: record.userId,
      localDate:
        record.localDate,
      utcOffsetMinutes:
        record.utcOffsetMinutes,
      sleepHours:
        record.sleepHours,
      sleepQuality:
        record.sleepQuality,
      energyLevel:
        record.energyLevel,
      sorenessLevel:
        record.sorenessLevel,
      stressLevel:
        record.stressLevel,
      painAreas,
      note: record.note,
      createdAt:
        record.createdAt,
      updatedAt:
        record.updatedAt,
    };
  }
}
