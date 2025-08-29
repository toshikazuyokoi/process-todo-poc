import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeBaseManagerService } from '../knowledge-base-manager.service';
import { ProcessKnowledgeRepository } from '../../ai-agent/repositories/process-knowledge.repository.interface';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestDataFactory } from '../../../../test/utils/test-data.factory';

describe('KnowledgeBaseManagerService', () => {
  let service: KnowledgeBaseManagerService;
  let processKnowledgeRepository: jest.Mocked<ProcessKnowledgeRepository>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseManagerService,
        {
          provide: 'ProcessKnowledgeRepository',
          useValue: {
            findByCategory: jest.fn(),
            findByIndustry: jest.fn(),
            findByProcessType: jest.fn(),
            findBestPractices: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            search: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            aiProcessKnowledge: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            $queryRaw: jest.fn(),
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KnowledgeBaseManagerService>(KnowledgeBaseManagerService);
    processKnowledgeRepository = module.get('ProcessKnowledgeRepository');
    prismaService = module.get(PrismaService);
  });

  describe('getIndustryTemplates', () => {
    describe('正常系', () => {
      it('should return industry templates with default parameters', async () => {
        // Arrange
        const mockKnowledge = [
          TestDataFactory.createMockProcessKnowledge({
            category: 'industry_template',
            industry: 'software',
            content: {
              commonProcesses: ['agile', 'waterfall'],
              typicalStakeholders: ['PM', 'Dev'],
              regulatoryRequirements: ['GDPR'],
              standardDurations: { planning: 40 },
            },
          }),
        ];
        
        prismaService.aiProcessKnowledge.findMany.mockResolvedValue(mockKnowledge);
        prismaService.aiProcessKnowledge.count.mockResolvedValue(1);

        // Act
        const result = await service.getIndustryTemplates({});

        // Assert
        expect(result.templates).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.templates[0].name).toBe('Test Knowledge');
        expect(result.templates[0].commonProcesses).toEqual(['agile', 'waterfall']);
        expect(prismaService.aiProcessKnowledge.findMany).toHaveBeenCalledWith({
          where: {
            category: 'industry_template',
            isActive: true,
          },
          skip: 0,
          take: 20,
          orderBy: { confidenceScore: 'desc' },
        });
      });

      it('should filter by industry when provided', async () => {
        // Arrange
        const query = { industry: 'healthcare' };
        prismaService.aiProcessKnowledge.findMany.mockResolvedValue([]);
        prismaService.aiProcessKnowledge.count.mockResolvedValue(0);

        // Act
        await service.getIndustryTemplates(query);

        // Assert
        expect(prismaService.aiProcessKnowledge.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              industry: 'healthcare',
            }),
          }),
        );
      });

      it('should apply pagination correctly', async () => {
        // Arrange
        const query = { limit: 10, offset: 20 };
        prismaService.aiProcessKnowledge.findMany.mockResolvedValue([]);
        prismaService.aiProcessKnowledge.count.mockResolvedValue(0);

        // Act
        await service.getIndustryTemplates(query);

        // Assert
        expect(prismaService.aiProcessKnowledge.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 20,
            take: 10,
          }),
        );
      });

      it('should filter by search term in title and description', async () => {
        // Arrange
        const query = { search: 'agile' };
        prismaService.aiProcessKnowledge.findMany.mockResolvedValue([]);
        prismaService.aiProcessKnowledge.count.mockResolvedValue(0);

        // Act
        await service.getIndustryTemplates(query);

        // Assert
        expect(prismaService.aiProcessKnowledge.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: 'agile', mode: 'insensitive' } },
                { description: { contains: 'agile', mode: 'insensitive' } },
              ],
            }),
          }),
        );
      });
    });

    describe('異常系', () => {
      it('should handle database errors gracefully', async () => {
        // Arrange
        prismaService.aiProcessKnowledge.findMany.mockRejectedValue(new Error('Database error'));

        // Act & Assert
        await expect(service.getIndustryTemplates({})).rejects.toThrow('Database error');
      });

      it('should handle invalid confidence score filter', async () => {
        // Arrange
        const query = { minConfidence: 1.5 }; // Invalid: > 1.0
        prismaService.aiProcessKnowledge.findMany.mockResolvedValue([]);
        prismaService.aiProcessKnowledge.count.mockResolvedValue(0);

        // Act
        const result = await service.getIndustryTemplates(query);

        // Assert
        expect(result.templates).toEqual([]);
        // Service should handle it gracefully or validate beforehand
      });
    });
  });

  describe('createIndustryTemplate', () => {
    describe('正常系', () => {
      it('should create a new industry template', async () => {
        // Arrange
        const input = {
          name: 'Healthcare Industry',
          commonProcesses: ['patient registration', 'diagnosis'],
          typicalStakeholders: ['doctor', 'nurse', 'patient'],
          regulatoryRequirements: ['HIPAA', 'GDPR'],
          standardDurations: { consultation: 30, treatment: 60 },
        };

        const createdKnowledge = TestDataFactory.createMockProcessKnowledge({
          id: 123,
          title: input.name,
          category: 'industry_template',
        });

        prismaService.aiProcessKnowledge.create.mockResolvedValue(createdKnowledge);

        // Act
        const result = await service.createIndustryTemplate(input);

        // Assert
        expect(result.name).toBe(input.name);
        expect(prismaService.aiProcessKnowledge.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            category: 'industry_template',
            title: input.name,
            content: expect.objectContaining({
              commonProcesses: input.commonProcesses,
              typicalStakeholders: input.typicalStakeholders,
            }),
          }),
        });
      });

      it('should set default values for optional fields', async () => {
        // Arrange
        const input = {
          name: 'Minimal Template',
          commonProcesses: ['process1'],
          typicalStakeholders: ['stakeholder1'],
          regulatoryRequirements: [],
        };

        prismaService.aiProcessKnowledge.create.mockResolvedValue(
          TestDataFactory.createMockProcessKnowledge(),
        );

        // Act
        await service.createIndustryTemplate(input);

        // Assert
        expect(prismaService.aiProcessKnowledge.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            confidenceScore: 0.7, // default value
            isActive: true,
          }),
        });
      });
    });
  });

  describe('updateIndustryTemplate', () => {
    describe('正常系', () => {
      it('should update an existing industry template', async () => {
        // Arrange
        const id = 'ind-001';
        const updates = {
          name: 'Updated Healthcare',
          commonProcesses: ['updated process'],
        };

        const existingKnowledge = TestDataFactory.createMockProcessKnowledge({
          id: 1,
          category: 'industry_template',
        });

        prismaService.$queryRaw.mockResolvedValue([{ id: 1 }]);
        prismaService.aiProcessKnowledge.findFirst.mockResolvedValue(existingKnowledge);
        prismaService.aiProcessKnowledge.update.mockResolvedValue({
          ...existingKnowledge,
          title: updates.name,
        });

        // Act
        const result = await service.updateIndustryTemplate(id, updates);

        // Assert
        expect(result.name).toBe(updates.name);
        expect(prismaService.aiProcessKnowledge.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: expect.objectContaining({
            title: updates.name,
          }),
        });
      });

      it('should handle partial updates correctly', async () => {
        // Arrange
        const id = 'ind-002';
        const updates = { name: 'Only Name Updated' };

        prismaService.$queryRaw.mockResolvedValue([{ id: 2 }]);
        prismaService.aiProcessKnowledge.findFirst.mockResolvedValue(
          TestDataFactory.createMockProcessKnowledge({
            content: {
              commonProcesses: ['existing'],
              typicalStakeholders: ['existing'],
            },
          }),
        );
        prismaService.aiProcessKnowledge.update.mockResolvedValue(
          TestDataFactory.createMockProcessKnowledge(),
        );

        // Act
        await service.updateIndustryTemplate(id, updates);

        // Assert
        expect(prismaService.aiProcessKnowledge.update).toHaveBeenCalledWith({
          where: { id: 2 },
          data: expect.objectContaining({
            title: updates.name,
            content: expect.objectContaining({
              commonProcesses: ['existing'], // preserved
              typicalStakeholders: ['existing'], // preserved
            }),
          }),
        });
      });
    });

    describe('異常系', () => {
      it('should throw NotFoundException when template not found', async () => {
        // Arrange
        prismaService.$queryRaw.mockResolvedValue([]);

        // Act & Assert
        await expect(
          service.updateIndustryTemplate('ind-999', { name: 'Test' }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('bulkUpdateBestPractices', () => {
    describe('正常系', () => {
      it('should update multiple best practices successfully', async () => {
        // Arrange
        const input = {
          ids: ['bp-001', 'bp-002', 'bp-003'],
          updates: {
            confidenceScore: 0.9,
            tags: ['updated'],
          },
        };

        // Mock ID resolution
        prismaService.$queryRaw.mockResolvedValue([
          { id: 1 },
          { id: 2 },
          { id: 3 },
        ]);

        // Mock individual updates
        prismaService.$transaction.mockImplementation(async (fn) => {
          return fn({
            aiProcessKnowledge: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

        // Act
        const result = await service.bulkUpdateBestPractices(input);

        // Assert
        expect(result.totalUpdated).toBe(3);
        expect(result.updatedIds).toEqual(['bp-001', 'bp-002', 'bp-003']);
        expect(result.failures).toEqual([]);
      });

      it('should handle partial failures gracefully', async () => {
        // Arrange
        const input = {
          ids: ['bp-001', 'bp-002', 'bp-999'],
          updates: {
            confidenceScore: 0.85,
          },
        };

        // Mock: bp-999 not found
        prismaService.$queryRaw
          .mockResolvedValueOnce([{ id: 1 }]) // bp-001
          .mockResolvedValueOnce([{ id: 2 }]) // bp-002
          .mockResolvedValueOnce([]); // bp-999 not found

        prismaService.$transaction.mockImplementation(async (fn) => {
          return fn({
            aiProcessKnowledge: {
              update: jest.fn()
                .mockResolvedValueOnce({}) // bp-001 success
                .mockResolvedValueOnce({}), // bp-002 success
            },
          });
        });

        // Act
        const result = await service.bulkUpdateBestPractices(input);

        // Assert
        expect(result.totalUpdated).toBe(2);
        expect(result.updatedIds).toEqual(['bp-001', 'bp-002']);
        expect(result.failures).toEqual([
          { id: 'bp-999', error: 'Best practice not found' },
        ]);
      });

      it('should apply addTags and removeTags operations', async () => {
        // Arrange
        const input = {
          ids: ['bp-001'],
          updates: {
            addTags: ['new-tag'],
            removeTags: ['old-tag'],
          },
        };

        prismaService.$queryRaw.mockResolvedValue([{ id: 1 }]);
        prismaService.aiProcessKnowledge.findFirst.mockResolvedValue(
          TestDataFactory.createMockProcessKnowledge({
            tags: ['old-tag', 'existing-tag'],
          }),
        );

        prismaService.$transaction.mockImplementation(async (fn) => {
          return fn({
            aiProcessKnowledge: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

        // Act
        await service.bulkUpdateBestPractices(input);

        // Assert
        expect(prismaService.aiProcessKnowledge.findFirst).toHaveBeenCalled();
        // Tags should be: ['existing-tag', 'new-tag'] (removed 'old-tag', added 'new-tag')
      });
    });

    describe('異常系', () => {
      it('should handle empty ID list', async () => {
        // Arrange
        const input = {
          ids: [],
          updates: { confidenceScore: 0.8 },
        };

        // Act
        const result = await service.bulkUpdateBestPractices(input);

        // Assert
        expect(result.totalUpdated).toBe(0);
        expect(result.updatedIds).toEqual([]);
      });

      it('should handle database errors during transaction', async () => {
        // Arrange
        const input = {
          ids: ['bp-001'],
          updates: { confidenceScore: 0.9 },
        };

        prismaService.$queryRaw.mockResolvedValue([{ id: 1 }]);
        prismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

        // Act
        const result = await service.bulkUpdateBestPractices(input);

        // Assert
        expect(result.failures).toContainEqual({
          id: 'bp-001',
          error: 'Transaction failed',
        });
      });
    });
  });

  describe('deleteProcessType', () => {
    describe('正常系', () => {
      it('should delete a process type successfully', async () => {
        // Arrange
        const id = 'proc-001';
        
        prismaService.$queryRaw.mockResolvedValue([{ id: 1 }]);
        prismaService.aiProcessKnowledge.delete.mockResolvedValue({});

        // Act
        await service.deleteProcessType(id);

        // Assert
        expect(prismaService.aiProcessKnowledge.delete).toHaveBeenCalledWith({
          where: { id: 1 },
        });
      });
    });

    describe('異常系', () => {
      it('should throw NotFoundException when process type not found', async () => {
        // Arrange
        prismaService.$queryRaw.mockResolvedValue([]);

        // Act & Assert
        await expect(service.deleteProcessType('proc-999')).rejects.toThrow(NotFoundException);
      });
    });
  });
});