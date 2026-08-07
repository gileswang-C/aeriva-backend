import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type EquipmentEnvironment = 'GYM' | 'HOME';

export interface EquipmentItem {
  id: number;
  name: string;
  category: string;
  environments: EquipmentEnvironment[];
}

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<EquipmentItem[]> {
    const equipment = await this.prisma.equipment.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    return equipment.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      environments: this.getEnvironments(
        item.supportsGym,
        item.supportsHome,
      ),
    }));
  }

  async findByEnvironment(
    environment: EquipmentEnvironment,
  ): Promise<EquipmentItem[]> {
    const equipment = await this.prisma.equipment.findMany({
      where:
        environment === 'HOME'
          ? { supportsHome: true }
          : { supportsGym: true },
      orderBy: {
        id: 'asc',
      },
    });

    return equipment.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      environments: this.getEnvironments(
        item.supportsGym,
        item.supportsHome,
      ),
    }));
  }

  private getEnvironments(
    supportsGym: boolean,
    supportsHome: boolean,
  ): EquipmentEnvironment[] {
    const environments: EquipmentEnvironment[] = [];

    if (supportsGym) {
      environments.push('GYM');
    }

    if (supportsHome) {
      environments.push('HOME');
    }

    return environments;
  }
}