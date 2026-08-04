import { Module } from '@nestjs/common';
import { UserEquipmentController } from './user-equipment.controller';
import { UserEquipmentService } from './user-equipment.service';

@Module({
  controllers: [UserEquipmentController],
  providers: [UserEquipmentService]
})
export class UserEquipmentModule {}
