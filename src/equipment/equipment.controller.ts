import { Controller, Get } from '@nestjs/common';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  findAll() {
    return {
      status: 'ok',
      data: this.equipmentService.findAll(),
    };
  }
}