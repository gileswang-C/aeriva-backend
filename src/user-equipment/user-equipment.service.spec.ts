import { Test, TestingModule } from '@nestjs/testing';
import { UserEquipmentService } from './user-equipment.service';

describe('UserEquipmentService', () => {
  let service: UserEquipmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserEquipmentService],
    }).compile();

    service = module.get<UserEquipmentService>(UserEquipmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
