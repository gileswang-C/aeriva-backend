import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { BodyStateService } from './body-state.service';
import type { UpsertBodyStateInput } from './body-state.service';

@Controller('body-state')
export class BodyStateController {
  constructor(
    private readonly bodyStateService: BodyStateService,
  ) {}

  @Put(':userId/today')
  async upsertToday(
    @Param('userId') userId: string,
    @Body()
    body: UpsertBodyStateInput,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    this.validateUserId(userId);
    this.validateBody(body);

    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.bodyStateService.upsertToday(
          userId,
          body,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  @Get(':userId/today')
  async findToday(
    @Param('userId') userId: string,
    @Query('utcOffsetMinutes')
    utcOffsetMinutes?: string,
  ) {
    this.validateUserId(userId);

    const parsedUtcOffsetMinutes =
      this.parseUtcOffsetMinutes(
        utcOffsetMinutes,
      );

    return {
      status: 'ok',
      data:
        await this.bodyStateService.findToday(
          userId,
          parsedUtcOffsetMinutes,
        ),
    };
  }

  private validateUserId(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }
  }

  private parseUtcOffsetMinutes(
    value?: string,
  ) {
    if (value === undefined) {
      return 480;
    }

    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed < -720 ||
      parsed > 840
    ) {
      throw new BadRequestException(
        'utcOffsetMinutes must be an integer between -720 and 840',
      );
    }

    return parsed;
  }

  private validateBody(
    body: UpsertBodyStateInput,
  ) {
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      throw new BadRequestException(
        'Request body must be an object',
      );
    }

    this.validateOptionalNumber(
      'sleepHours',
      body.sleepHours,
      0,
      24,
      false,
    );

    this.validateOptionalNumber(
      'sleepQuality',
      body.sleepQuality,
      1,
      5,
      true,
    );

    this.validateOptionalNumber(
      'energyLevel',
      body.energyLevel,
      1,
      5,
      true,
    );

    this.validateOptionalNumber(
      'sorenessLevel',
      body.sorenessLevel,
      1,
      5,
      true,
    );

    this.validateOptionalNumber(
      'stressLevel',
      body.stressLevel,
      1,
      5,
      true,
    );

    if (
      body.painAreas !== undefined
    ) {
      if (
        !Array.isArray(
          body.painAreas,
        ) ||
        !body.painAreas.every(
          (item) =>
            typeof item === 'string',
        )
      ) {
        throw new BadRequestException(
          'painAreas must be an array of strings',
        );
      }
    }

    if (
      body.note !== undefined &&
      typeof body.note !== 'string'
    ) {
      throw new BadRequestException(
        'note must be a string',
      );
    }
  }

  private validateOptionalNumber(
    field: string,
    value: number | undefined,
    min: number,
    max: number,
    integer: boolean,
  ) {
    if (value === undefined) {
      return;
    }

    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (
        integer &&
        !Number.isInteger(value)
      )
    ) {
      const typeText =
        integer
          ? 'an integer'
          : 'a number';

      throw new BadRequestException(
        `${field} must be ${typeText} between ${min} and ${max}`,
      );
    }
  }
}
