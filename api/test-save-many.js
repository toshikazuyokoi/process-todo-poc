// Test the saveMany method specifically
const { PrismaService } = require('./dist/infrastructure/prisma/prisma.service');
const { StepInstanceRepository } = require('./dist/infrastructure/repositories/step-instance.repository');
const { StepInstance } = require('./dist/domain/entities/step-instance');

async function testSaveMany() {
  console.log('=== Testing Repository saveMany ===\n');
  
  const prismaService = new PrismaService();
  await prismaService.$connect();
  
  const repo = new StepInstanceRepository(prismaService);
  
  try {
    // Create multiple StepInstance entities
    const dates = [
      new Date('2025-11-20T00:00:00.000Z'),
      new Date('2025-11-25T00:00:00.000Z'),
      new Date('2025-11-30T00:00:00.000Z'),
    ];
    
    console.log('Creating StepInstance entities...');
    const stepInstances = dates.map((date, index) => {
      console.log(`  Step ${index + 1}: ${date.toISOString()} (Year: ${date.getFullYear()})`);
      return new StepInstance(
        null,
        23,
        2,
        `Test SaveMany ${index + 1}`,
        date,
        null,
        'todo',
        false,
        new Date(),
        new Date(),
      );
    });
    
    // Check entities before save
    console.log('\nEntities before save:');
    stepInstances.forEach((si, index) => {
      const date = si.getDueDate()?.getDate();
      console.log(`  Step ${index + 1}: ${date ? date.toISOString() : 'null'} (Year: ${date ? date.getFullYear() : 'null'})`);
    });
    
    // Save through repository saveMany
    console.log('\nSaving through repository.saveMany()...');
    const saved = await repo.saveMany(stepInstances);
    
    // Check saved entities
    console.log('\nEntities after save:');
    saved.forEach((si, index) => {
      const date = si.getDueDate()?.getDate();
      console.log(`  Step ${index + 1}: ${date ? date.toISOString() : 'null'} (Year: ${date ? date.getFullYear() : 'null'})`);
      if (date && date.getFullYear() < 2000) {
        console.error(`    ❌ ERROR: Date became 1970!`);
      } else {
        console.log(`    ✅ Date saved correctly`);
      }
    });
    
    // Query database directly to verify
    console.log('\nQuerying database directly...');
    const ids = saved.map(s => s.getId()).filter(id => id !== null);
    const dbResults = await prismaService.stepInstance.findMany({
      where: { id: { in: ids } },
      orderBy: { name: 'asc' }
    });
    
    dbResults.forEach((result, index) => {
      console.log(`  Step ${index + 1} in DB: ${result.dueDateUtc} (Year: ${new Date(result.dueDateUtc).getFullYear()})`);
    });
    
    // Clean up
    await prismaService.stepInstance.deleteMany({
      where: { id: { in: ids } }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaService.$disconnect();
  }
}

testSaveMany().catch(console.error);