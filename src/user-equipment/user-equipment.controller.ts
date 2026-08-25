import {
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { UserEquipmentService } from './user-equipment.service';

class UpdateUserEquipmentBody {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  homeEquipmentIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  gymEquipmentIds?: number[];
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