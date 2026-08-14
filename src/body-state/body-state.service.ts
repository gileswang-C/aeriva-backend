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

  async getTodayReadiness(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const bodyState =
      await this.findToday(
        userId,
        utcOffsetMinutes,
      );

    if (!bodyState) {
      return {
        userId,
        localDate:
          this.getLocalDate(
            utcOffsetMinutes,
          ),
        utcOffsetMinutes,
        hasBodyState: false,
        readinessScore: null,
        readinessStatus: 'NO_DATA',
        reasons: [
          '今天还没有身体状态记录。',
        ],
        painAreas: [],
        recommendedAction:
          '先完成今日身体状态记录，再生成训练建议。',
      };
    }

    let score = 100;
    const reasons: string[] = [];

    if (
      bodyState.sleepHours !== null
    ) {
      if (bodyState.sleepHours < 5) {
        score -= 25;
        reasons.push(
          '睡眠不足 5 小时，恢复可能明显不足。',
        );
      } else if (
        bodyState.sleepHours < 6
      ) {
        score -= 18;
        reasons.push(
          '睡眠不足 6 小时，建议降低训练压力。',
        );
      } else if (
        bodyState.sleepHours < 7
      ) {
        score -= 10;
        reasons.push(
          '睡眠时间低于 7 小时，恢复状态一般。',
        );
      }
    }

    if (
      bodyState.sleepQuality !== null
    ) {
      if (
        bodyState.sleepQuality === 1
      ) {
        score -= 15;
        reasons.push(
          '睡眠质量很差。',
        );
      } else if (
        bodyState.sleepQuality === 2
      ) {
        score -= 10;
        reasons.push(
          '睡眠质量偏低。',
        );
      } else if (
        bodyState.sleepQuality === 3
      ) {
        score -= 5;
        reasons.push(
          '睡眠质量一般。',
        );
      }
    }

    if (
      bodyState.energyLevel !== null
    ) {
      if (
        bodyState.energyLevel === 1
      ) {
        score -= 25;
        reasons.push(
          '当前精力非常低。',
        );
      } else if (
        bodyState.energyLevel === 2
      ) {
        score -= 18;
        reasons.push(
          '当前精力偏低。',
        );
      } else if (
        bodyState.energyLevel === 3
      ) {
        score -= 8;
        reasons.push(
          '当前精力一般。',
        );
      }
    }

    if (
      bodyState.sorenessLevel !== null
    ) {
      if (
        bodyState.sorenessLevel === 5
      ) {
        score -= 25;
        reasons.push(
          '肌肉酸痛程度很高。',
        );
      } else if (
        bodyState.sorenessLevel === 4
      ) {
        score -= 15;
        reasons.push(
          '肌肉酸痛程度偏高。',
        );
      } else if (
        bodyState.sorenessLevel === 3
      ) {
        score -= 5;
        reasons.push(
          '存在中等程度肌肉酸痛。',
        );
      }
    }

    if (
      bodyState.stressLevel !== null
    ) {
      if (
        bodyState.stressLevel === 5
      ) {
        score -= 15;
        reasons.push(
          '当前压力水平很高。',
        );
      } else if (
        bodyState.stressLevel === 4
      ) {
        score -= 10;
        reasons.push(
          '当前压力水平偏高。',
        );
      } else if (
        bodyState.stressLevel === 3
      ) {
        score -= 5;
        reasons.push(
          '当前存在一定压力。',
        );
      }
    }

    const painAreas =
      bodyState.painAreas ?? [];

    if (painAreas.length > 0) {
      score -= 5;

      reasons.push(
        `当前记录疼痛部位：${painAreas.join('、')}。`,
      );
    }

    score = Math.max(
      0,
      Math.min(100, score),
    );

    let readinessStatus:
      | 'READY'
      | 'REDUCE_INTENSITY'
      | 'AVOID_PAIN_AREA'
      | 'RECOVERY';

    let recommendedAction: string;

    if (score < 50) {
      readinessStatus = 'RECOVERY';

      recommendedAction =
        '今天优先恢复，可选择休息、散步或轻量活动，避免高强度训练。';
    } else if (
      painAreas.length > 0
    ) {
      readinessStatus =
        'AVOID_PAIN_AREA';

      recommendedAction =
        `避免训练疼痛部位（${painAreas.join('、')}），并适当降低整体训练强度，可切换到无疼痛的训练部位。`;
    } else if (score < 75) {
      readinessStatus =
        'REDUCE_INTENSITY';

      recommendedAction =
        '今天可以训练，但建议降低重量或训练组数，避免力竭。';
    } else {
      readinessStatus = 'READY';

      recommendedAction =
        '当前身体状态适合按计划训练，训练过程中继续观察身体反馈。';
    }

    if (reasons.length === 0) {
      reasons.push(
        '今日身体状态指标整体稳定。',
      );
    }

    return {
      userId,
      localDate:
        bodyState.localDate,
      utcOffsetMinutes,
      hasBodyState: true,
      readinessScore: score,
      readinessStatus,
      reasons,
      painAreas,
      recommendedAction,
      bodyState,
    };
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
