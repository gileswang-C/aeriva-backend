import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UserEquipmentService } from './user-equipment.service';

describe('UserEquipmentService', () => {
  let service: UserEquipmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEquipmentService,
        {
          provide: PrismaService,
          useValue: {
            userEquipment: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserEquipmentService>(
      UserEquipmentService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
