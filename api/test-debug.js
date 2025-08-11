// Simple debug test script
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBusinessDayCalculation() {
  console.log('=== Testing Business Day Calculation ===');
  
  // Fetch holidays
  const holidays = await prisma.holiday.findMany({
    where: {
      countryCode: 'JP',
      date: {
        gte: new Date('2025-01-01'),
        lte: new Date('2025-12-31')
      }
    }
  });
  
  console.log(`Found ${holidays.length} holidays in 2025`);
  
  // Test a simple date calculation
  const startDate = new Date('2025-12-31');
  console.log('Start date:', startDate.toISOString());
  
  // Add 5 days (should skip weekends)
  const result = new Date(startDate);
  let daysAdded = 0;
  while (daysAdded < 5) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  console.log('After adding 5 business days:', result.toISOString());
  console.log('Year:', result.getFullYear());
  
  // Test with dependencies
  const templates = await prisma.stepTemplate.findMany({
    where: { processId: 1 },
    orderBy: { seq: 'asc' }
  });
  
  console.log('\n=== Step Templates ===');
  templates.forEach(t => {
    console.log(`${t.id}: ${t.name} (${t.basis}, offset: ${t.offsetDays}, deps: ${JSON.stringify(t.dependsOnJson)})`);
  });
  
  await prisma.$disconnect();
}

testBusinessDayCalculation().catch(e => {
  console.error(e);
  process.exit(1);
});