import { Test, TestingModule } from '@nestjs/testing';
import { UserEquipmentController } from './user-equipment.controller';

describe('UserEquipmentController', () => {
  let controller: UserEquipmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserEquipmentController],
    }).compile();

    controller = module.get<UserEquipmentController>(UserEquipmentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
