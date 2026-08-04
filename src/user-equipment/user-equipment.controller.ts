import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { UserEquipmentService } from './user-equipment.service';

interface UpdateUserEquipmentBody {
  homeEquipmentIds: number[];
  gymEquipmentIds: number[];
}

@Controller('user-equipment')
export class UserEquipmentController {
  constructor(
    private readonly userEquipmentService: UserEquipmentService,
  ) {}

  @Get(':userId')
  findByUserId(@Param('userId') userId: string) {
    return {
      status: 'ok',
      data: this.userEquipmentService.findByUserId(userId),
    };
  }

  @Put(':userId')
  update(
    @Param('userId') userId: string,
    @Body() body: UpdateUserEquipmentBody,
  ) {
    return {
      status: 'ok',
      message: 'User equipment updated',
      data: this.userEquipmentService.update(
        userId,
        body.homeEquipmentIds ?? [],
        body.gymEquipmentIds ?? [],
      ),
    };
  }
}