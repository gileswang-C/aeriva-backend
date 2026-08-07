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

  console.log('Equipment seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });