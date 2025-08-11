// Direct test to find where the 1970 date issue occurs
const { PrismaClient } = require('@prisma/client');

async function testDirectInsert() {
  console.log('=== Direct Prisma Test ===\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Test 1: Direct insert with Date object
    console.log('Test 1: Direct insert with Date object');
    const date1 = new Date('2025-11-20T00:00:00.000Z');
    console.log('  Input date:', date1.toISOString());
    
    const result1 = await prisma.stepInstance.create({
      data: {
        caseId: 23,
        templateId: 2,
        name: 'Test Direct Date Object',
        dueDateUtc: date1,
        status: 'todo',
        locked: false,
      },
    });
    
    console.log('  Saved date:', result1.dueDateUtc);
    console.log('  Year:', new Date(result1.dueDateUtc).getFullYear());
    if (new Date(result1.dueDateUtc).getFullYear() < 2000) {
      console.error('  ❌ ERROR: Date became 1970!');
    } else {
      console.log('  ✅ Date saved correctly');
    }
    
    // Test 2: Direct insert with ISO string
    console.log('\nTest 2: Direct insert with ISO string');
    const dateStr = '2025-11-21T00:00:00.000Z';
    console.log('  Input date:', dateStr);
    
    const result2 = await prisma.stepInstance.create({
      data: {
        caseId: 23,
        templateId: 2,
        name: 'Test ISO String',
        dueDateUtc: dateStr,
        status: 'todo',
        locked: false,
      },
    });
    
    console.log('  Saved date:', result2.dueDateUtc);
    console.log('  Year:', new Date(result2.dueDateUtc).getFullYear());
    if (new Date(result2.dueDateUtc).getFullYear() < 2000) {
      console.error('  ❌ ERROR: Date became 1970!');
    } else {
      console.log('  ✅ Date saved correctly');
    }
    
    // Test 3: Direct insert with timestamp
    console.log('\nTest 3: Direct insert with timestamp');
    const timestamp = Date.parse('2025-11-22T00:00:00.000Z');
    console.log('  Input timestamp:', timestamp);
    console.log('  As date:', new Date(timestamp).toISOString());
    
    const result3 = await prisma.stepInstance.create({
      data: {
        caseId: 23,
        templateId: 2,
        name: 'Test Timestamp',
        dueDateUtc: new Date(timestamp),
        status: 'todo',
        locked: false,
      },
    });
    
    console.log('  Saved date:', result3.dueDateUtc);
    console.log('  Year:', new Date(result3.dueDateUtc).getFullYear());
    if (new Date(result3.dueDateUtc).getFullYear() < 2000) {
      console.error('  ❌ ERROR: Date became 1970!');
    } else {
      console.log('  ✅ Date saved correctly');
    }
    
    // Clean up
    await prisma.stepInstance.deleteMany({
      where: {
        name: {
          in: ['Test Direct Date Object', 'Test ISO String', 'Test Timestamp']
        }
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectInsert().catch(console.error);