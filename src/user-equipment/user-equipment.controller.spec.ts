import { Test, TestingModule } from '@nestjs/testing';
import { UserEquipmentController } from './user-equipment.controller';
import { UserEquipmentService } from './user-equipment.service';

describe('UserEquipmentController', () => {
  let controller: UserEquipmentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserEquipmentController],
      providers: [
        {
          provide: UserEquipmentService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UserEquipmentController>(
      UserEquipmentController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
