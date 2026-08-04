import { Injectable } from '@nestjs/common';

export interface UserEquipmentProfile {
  userId: string;
  homeEquipmentIds: number[];
  gymEquipmentIds: number[];
  updatedAt: string;
}

@Injectable()
export class UserEquipmentService {
  private readonly profiles = new Map<string, UserEquipmentProfile>([
    [
      'demo-user',
      {
        userId: 'demo-user',
        homeEquipmentIds: [1, 4, 5],
        gymEquipmentIds: [1, 2, 3, 4, 5],
        updatedAt: new Date().toISOString(),
      },
    ],
  ]);

  findByUserId(userId: string): UserEquipmentProfile {
    return (
      this.profiles.get(userId) ?? {
        userId,
        homeEquipmentIds: [],
        gymEquipmentIds: [],
        updatedAt: new Date().toISOString(),
      }
    );
  }

  update(
    userId: string,
    homeEquipmentIds: number[],
    gymEquipmentIds: number[],
  ): UserEquipmentProfile {
    const profile: UserEquipmentProfile = {
      userId,
      homeEquipmentIds: [...new Set(homeEquipmentIds)],
      gymEquipmentIds: [...new Set(gymEquipmentIds)],
      updatedAt: new Date().toISOString(),
    };

    this.profiles.set(userId, profile);

    return profile;
  }
}