// Test the repository layer
const { PrismaService } = require('./dist/infrastructure/prisma/prisma.service');
const { StepInstanceRepository } = require('./dist/infrastructure/repositories/step-instance.repository');
const { StepInstance } = require('./dist/domain/entities/step-instance');

async function testRepository() {
  console.log('=== Testing Repository Layer ===\n');
  
  const prismaService = new PrismaService();
  await prismaService.$connect();
  
  const repo = new StepInstanceRepository(prismaService);
  
  try {
    // Test saving through repository
    console.log('Creating StepInstance entity...');
    const testDate = new Date('2025-11-25T00:00:00.000Z');
    console.log('  Input date:', testDate.toISOString());
    console.log('  Input year:', testDate.getFullYear());
    
    const stepInstance = new StepInstance(
      null,
      23,
      2,
      'Test Repository Layer',
      testDate,
      null,
      'todo',
      false,
      new Date(),
      new Date(),
    );
    
    // Check entity before save
    const entityDate = stepInstance.getDueDate()?.getDate();
    console.log('\nEntity before save:');
    console.log('  Due date:', entityDate ? entityDate.toISOString() : 'null');
    console.log('  Year:', entityDate ? entityDate.getFullYear() : 'null');
    
    // Save through repository
    console.log('\nSaving through repository...');
    const saved = await repo.save(stepInstance);
    
    // Check saved entity
    const savedDate = saved.getDueDate()?.getDate();
    console.log('\nEntity after save:');
    console.log('  Due date:', savedDate ? savedDate.toISOString() : 'null');
    console.log('  Year:', savedDate ? savedDate.getFullYear() : 'null');
    
    if (savedDate && savedDate.getFullYear() < 2000) {
      console.error('  ❌ ERROR: Date became 1970 in repository!');
    } else {
      console.log('  ✅ Date saved correctly through repository');
    }
    
    // Query database directly to verify
    console.log('\nQuerying database directly...');
    const dbResult = await prismaService.stepInstance.findUnique({
      where: { id: saved.getId() }
    });
    
    console.log('  Database date:', dbResult.dueDateUtc);
    console.log('  Database year:', new Date(dbResult.dueDateUtc).getFullYear());
    
    // Clean up
    await prismaService.stepInstance.delete({
      where: { id: saved.getId() }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaService.$disconnect();
  }
}

testRepository().catch(console.error);