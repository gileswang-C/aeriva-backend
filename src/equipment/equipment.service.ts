import { Injectable } from '@nestjs/common';

export interface EquipmentItem {
  id: number;
  name: string;
  category: string;
  environments: Array<'GYM' | 'HOME'>;
}

@Injectable()
export class EquipmentService {
  private readonly equipment: EquipmentItem[] = [
    {
      id: 1,
      name: '哑铃',
      category: '自由重量',
      environments: ['GYM', 'HOME'],
    },
    {
      id: 2,
      name: '龙门架',
      category: '综合训练器械',
      environments: ['GYM'],
    },
    {
      id: 3,
      name: '高位下拉机',
      category: '固定器械',
      environments: ['GYM'],
    },
    {
      id: 4,
      name: '弹力带',
      category: '便携器械',
      environments: ['GYM', 'HOME'],
    },
    {
      id: 5,
      name: '瑜伽垫',
      category: '辅助器械',
      environments: ['GYM', 'HOME'],
    },
  ];

  findAll(): EquipmentItem[] {
    return this.equipment;
  }
}