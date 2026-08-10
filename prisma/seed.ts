import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const equipment = [
    {
      id: 1,
      name: '哑铃',
      category: '自由重量',
      supportsGym: true,
      supportsHome: true,
    },
    {
      id: 2,
      name: '龙门架',
      category: '综合训练器械',
      supportsGym: true,
      supportsHome: false,
    },
    {
      id: 3,
      name: '高位下拉机',
      category: '固定器械',
      supportsGym: true,
      supportsHome: false,
    },
    {
      id: 4,
      name: '弹力带',
      category: '便携器械',
      supportsGym: true,
      supportsHome: true,
    },
    {
      id: 5,
      name: '瑜伽垫',
      category: '辅助器械',
      supportsGym: true,
      supportsHome: true,
    },
  ];

  for (const item of equipment) {
    await prisma.equipment.upsert({
      where: {
        id: item.id,
      },
      update: item,
      create: item,
    });
  }

  const exercises = [
    {
      id: 1,
      name: '哑铃卧推',
      category: '力量训练',
      targetMuscle: '胸部',
      difficulty: 'BEGINNER',
      equipmentId: 1,
    },
    {
      id: 2,
      name: '单臂哑铃划船',
      category: '力量训练',
      targetMuscle: '背部',
      difficulty: 'BEGINNER',
      equipmentId: 1,
    },
    {
      id: 3,
      name: '高位下拉',
      category: '力量训练',
      targetMuscle: '背部',
      difficulty: 'BEGINNER',
      equipmentId: 3,
    },
    {
      id: 4,
      name: '绳索下压',
      category: '力量训练',
      targetMuscle: '肱三头肌',
      difficulty: 'BEGINNER',
      equipmentId: 2,
    },
    {
      id: 5,
      name: '弹力带划船',
      category: '力量训练',
      targetMuscle: '背部',
      difficulty: 'BEGINNER',
      equipmentId: 4,
    },
    {
      id: 6,
      name: '徒手深蹲',
      category: '力量训练',
      targetMuscle: '腿部',
      difficulty: 'BEGINNER',
      equipmentId: null,
    },
    {
      id: 7,
      name: '俯卧撑',
      category: '力量训练',
      targetMuscle: '胸部',
      difficulty: 'BEGINNER',
      equipmentId: null,
    },
    {
      id: 8,
      name: '平板支撑',
      category: '核心训练',
      targetMuscle: '核心',
      difficulty: 'BEGINNER',
      equipmentId: null,
    },
  ];

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: {
        id: exercise.id,
      },
      update: exercise,
      create: exercise,
    });
  }

  console.log('Equipment and exercise seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });