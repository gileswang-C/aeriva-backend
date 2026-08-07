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
  async findByUserId(@Param('userId') userId: string) {
    const data =
      await this.userEquipmentService.findByUserId(userId);

    return {
      status: 'ok',
      data,
    };
  }

  @Put(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() body: UpdateUserEquipmentBody,
  ) {
    const data = await this.userEquipmentService.update(
      userId,
      body.homeEquipmentIds ?? [],
      body.gymEquipmentIds ?? [],
    );

    return {
      status: 'ok',
      message: 'User equipment updated',
      data,
    };
  }
}