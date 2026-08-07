import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import {
  EquipmentEnvironment,
  EquipmentService,
} from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  async findAll(@Query('environment') environment?: string) {
    if (!environment) {
      return {
        status: 'ok',
        filter: null,
        data: await this.equipmentService.findAll(),
      };
    }

    const normalizedEnvironment = environment.toUpperCase();

    if (
      normalizedEnvironment !== 'HOME' &&
      normalizedEnvironment !== 'GYM'
    ) {
      throw new BadRequestException(
        'environment must be HOME or GYM',
      );
    }

    return {
      status: 'ok',
      filter: normalizedEnvironment,
      data: await this.equipmentService.findByEnvironment(
        normalizedEnvironment as EquipmentEnvironment,
      ),
    };
  }
}