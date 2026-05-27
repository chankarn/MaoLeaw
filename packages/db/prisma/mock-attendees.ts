// File: packages/db/prisma/mock-attendees.ts
// Adds mock members + submissions to active events for UI testing.
//
// Usage:
//   pnpm --filter @maoleaw/db exec tsx prisma/mock-attendees.ts           → all active events
//   pnpm --filter @maoleaw/db exec tsx prisma/mock-attendees.ts <eventId> → specific event
//
// Re-running is safe: skips members/submissions that already exist.
import { PrismaClient, type DrinkChoice, type MemberType, type DrinkPreference } from '@prisma/client';

const prisma = new PrismaClient();

interface MockMember {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string;
  customName: string;
  preferredDrink: DrinkPreference;
  memberType: MemberType;
  drinkChoice: DrinkChoice;
}

const MOCKS: MockMember[] = [
  {
    lineUserId: 'U_mock_001',
    lineDisplayName: 'แตงโม',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=watermelon&backgroundColor=ffd5dc',
    customName: 'แตงโม',
    preferredDrink: 'LIQUOR',
    memberType: 'FRIEND',
    drinkChoice: 'LIQUOR',
  },
  {
    lineUserId: 'U_mock_002',
    lineDisplayName: 'ไอซ์',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ice&backgroundColor=b6e3f4',
    customName: 'ไอซ์',
    preferredDrink: 'BEER',
    memberType: 'BD',
    drinkChoice: 'BEER',
  },
  {
    lineUserId: 'U_mock_003',
    lineDisplayName: 'บูม',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boom&backgroundColor=c0aede',
    customName: 'บูม',
    preferredDrink: 'LIQUOR',
    memberType: 'TL',
    drinkChoice: 'LIQUOR',
  },
  {
    lineUserId: 'U_mock_004',
    lineDisplayName: 'เปรี้ยว',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priew&backgroundColor=ffdfbf',
    customName: 'เปรี้ยว',
    preferredDrink: 'BEER',
    memberType: 'KU',
    drinkChoice: 'NONE',
  },
  {
    lineUserId: 'U_mock_005',
    lineDisplayName: 'น้ำหวาน',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=namwarn&backgroundColor=d1d4f9',
    customName: 'น้ำหวาน',
    preferredDrink: 'BEER',
    memberType: 'FRIEND',
    drinkChoice: 'BEER',
  },
  {
    lineUserId: 'U_mock_006',
    lineDisplayName: 'จ๊อบ',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=job&backgroundColor=ffd5dc',
    customName: 'จ๊อบ',
    preferredDrink: 'LIQUOR',
    memberType: 'KU',
    drinkChoice: 'LIQUOR',
  },
  {
    lineUserId: 'U_mock_007',
    lineDisplayName: 'ฟลุ๊ค',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fluke&backgroundColor=b6e3f4',
    customName: 'ฟลุ๊ค',
    preferredDrink: 'BEER',
    memberType: 'BD',
    drinkChoice: 'BEER',
  },
  {
    lineUserId: 'U_mock_008',
    lineDisplayName: 'มะนาว',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manao&backgroundColor=c0aede',
    customName: 'มะนาว',
    preferredDrink: 'LIQUOR',
    memberType: 'OTHER',
    drinkChoice: 'NONE',
  },
  {
    lineUserId: 'U_mock_009',
    lineDisplayName: 'น้องเอ',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=swu1&backgroundColor=ffdfbf',
    customName: 'น้องเอ',
    preferredDrink: 'LIQUOR',
    memberType: 'SWU',
    drinkChoice: 'LIQUOR',
  },
  {
    lineUserId: 'U_mock_010',
    lineDisplayName: 'พี่บี',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cu1&backgroundColor=d1d4f9',
    customName: 'พี่บี',
    preferredDrink: 'BEER',
    memberType: 'CU',
    drinkChoice: 'BEER',
  },
  {
    lineUserId: 'U_mock_011',
    lineDisplayName: 'ซี',
    linePictureUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kmitl1&backgroundColor=ffd5dc',
    customName: 'ซี',
    preferredDrink: 'LIQUOR',
    memberType: 'KMITL',
    drinkChoice: 'LIQUOR',
  },
];

async function ensureMember(m: MockMember) {
  return prisma.member.upsert({
    where: { lineUserId: m.lineUserId },
    update: {
      lineDisplayName: m.lineDisplayName,
      linePictureUrl: m.linePictureUrl,
    },
    create: {
      lineUserId: m.lineUserId,
      lineDisplayName: m.lineDisplayName,
      linePictureUrl: m.linePictureUrl,
      customName: m.customName,
      preferredDrink: m.preferredDrink,
      memberType: m.memberType,
    },
  });
}

async function addToEvent(eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
  if (!event) {
    console.log(`  ⚠️  Event ${eventId} not found — skip`);
    return 0;
  }

  let added = 0;
  for (const mock of MOCKS) {
    const member = await ensureMember(mock);
    const existing = await prisma.submission.findUnique({
      where: { eventId_memberId: { eventId, memberId: member.id } },
    });
    if (existing) continue;
    await prisma.submission.create({
      data: {
        eventId,
        memberId: member.id,
        nameSnapshot: mock.customName,
        drinkChoice: mock.drinkChoice,
      },
    });
    added++;
  }
  console.log(`  ✓ ${event.name}: +${added} mock attendees`);
  return added;
}

async function main() {
  const targetId = process.argv[2];

  let events;
  if (targetId) {
    events = await prisma.event.findMany({ where: { id: targetId } });
    if (events.length === 0) throw new Error(`Event ${targetId} not found`);
  } else {
    events = await prisma.event.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
    });
    if (events.length === 0) {
      console.log('No active events to seed. Create one in admin first.');
      return;
    }
  }

  console.log(`Adding mock attendees to ${events.length} event(s)…`);
  let total = 0;
  for (const ev of events) total += await addToEvent(ev.id);
  console.log(`Done. Added ${total} submissions across ${events.length} event(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
