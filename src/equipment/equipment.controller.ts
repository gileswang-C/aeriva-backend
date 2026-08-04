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
  findAll(@Query('environment') environment?: string) {
    if (!environment) {
      return {
        status: 'ok',
        filter: null,
        data: this.equipmentService.findAll(),
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
      data: this.equipmentService.findByEnvironment(
        normalizedEnvironment as EquipmentEnvironment,
      ),
    };
  }
}