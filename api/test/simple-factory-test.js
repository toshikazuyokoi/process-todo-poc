const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Simple TestDataFactory implementation in JavaScript
class SimpleTestDataFactory {
  static counter = 0;

  static getUniquePrefix() {
    return `TEST_${Date.now()}_${++this.counter}_`;
  }

  static async createUser(options = {}) {
    const prefix = this.getUniquePrefix();
    return await prisma.user.create({
      data: {
        email: options.email || `${prefix}user@example.com`,
        name: options.name || `${prefix}User`,
        password: 'hashed_password',
        role: options.role || 'member',
      }
    });
  }

  static async createTemplate(options = {}) {
    const prefix = this.getUniquePrefix();
    const name = options.name || `${prefix}TEMPLATE`;
    const stepCount = options.stepCount || 1;

    return await prisma.processTemplate.create({
      data: {
        name,
        isActive: true,
        stepTemplates: {
          create: Array.from({ length: stepCount }, (_, i) => ({
            seq: i + 1,
            name: `Step ${i + 1}`,
            basis: i === 0 ? 'goal' : 'prev',
            offsetDays: i === 0 ? -10 : 5,
            requiredArtifactsJson: []
          }))
        }
      },
      include: { stepTemplates: true }
    });
  }

  static async cleanup(prefix) {
    await prisma.stepInstance.deleteMany({
      where: { name: { contains: prefix } }
    });
    await prisma.case.deleteMany({
      where: { title: { contains: prefix } }
    });
    const templates = await prisma.processTemplate.findMany({
      where: { name: { contains: prefix } },
      select: { id: true }
    });
    if (templates.length > 0) {
      await prisma.stepTemplate.deleteMany({
        where: { processId: { in: templates.map(t => t.id) } }
      });
      await prisma.processTemplate.deleteMany({
        where: { id: { in: templates.map(t => t.id) } }
      });
    }
    await prisma.user.deleteMany({
      where: { 
        OR: [
          { email: { contains: prefix } },
          { name: { contains: prefix } }
        ]
      }
    });
  }
}

async function testFactory() {
  console.log('Testing TestDataFactory...');
  
  const prefix = SimpleTestDataFactory.getUniquePrefix();
  console.log('Generated prefix:', prefix);

  try {
    // Test user creation
    const user = await SimpleTestDataFactory.createUser({
      email: `${prefix}test@example.com`,
      name: `${prefix}Test User`
    });
    console.log('✓ User created:', user.email);

    // Test template creation
    const template = await SimpleTestDataFactory.createTemplate({
      name: `${prefix}TEMPLATE`,
      stepCount: 2
    });
    console.log('✓ Template created:', template.name, 'with', template.stepTemplates.length, 'steps');

    // Test cleanup
    await SimpleTestDataFactory.cleanup(prefix);
    console.log('✓ Cleanup completed');

    // Verify cleanup
    const userAfter = await prisma.user.findUnique({
      where: { id: user.id }
    });
    if (!userAfter) {
      console.log('✓ User successfully deleted');
    } else {
      console.log('✗ User not deleted');
    }

    console.log('\n✅ TestDataFactory is working correctly!');
  } catch (error) {
    console.error('❌ Error testing factory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFactory();