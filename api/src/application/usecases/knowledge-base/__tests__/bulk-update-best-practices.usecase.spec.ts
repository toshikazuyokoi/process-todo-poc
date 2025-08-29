import { Test, TestingModule } from '@nestjs/testing';
import { BulkUpdateBestPracticesUseCase } from '../bulk-update-best-practices.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';
import { TestDataFactory } from '../../../../../test/utils/test-data.factory';

describe('BulkUpdateBestPracticesUseCase', () => {
  let useCase: BulkUpdateBestPracticesUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUpdateBestPracticesUseCase,
        {
          provide: KnowledgeBaseManagerService,
          useValue: {
            getIndustryTemplates: jest.fn(),
            createIndustryTemplate: jest.fn(),
            updateIndustryTemplate: jest.fn(),
            deleteIndustryTemplate: jest.fn(),
            getProcessTypes: jest.fn(),
            createProcessType: jest.fn(),
            updateProcessType: jest.fn(),
            deleteProcessType: jest.fn(),
            getBestPractices: jest.fn(),
            createBestPractice: jest.fn(),
            updateBestPractice: jest.fn(),
            bulkUpdateBestPractices: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<BulkUpdateBestPracticesUseCase>(BulkUpdateBestPracticesUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should bulk update best practices successfully', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 0.95 },
            { id: 'bp-002', confidence: 0.95 },
            { id: 'bp-003', confidence: 0.95 },
          ],
        };

        // Service returns void
        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(3);
        expect(result.updatedIds).toEqual(['bp-001', 'bp-002', 'bp-003']);
        expect(result.failures).toEqual([]);
        expect(knowledgeBaseManagerService.bulkUpdateBestPractices).toHaveBeenCalledWith(input.updates);
      });

      it('should handle multiple updates with different confidence scores', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 0.85 },
            { id: 'bp-002', confidence: 0.90 },
            { id: 'bp-003', confidence: 0.75 },
          ],
        };

        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(3);
        expect(result.updatedIds).toEqual(['bp-001', 'bp-002', 'bp-003']);
        expect(result.failures).toEqual([]);
      });

      it('should handle single update', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 1.0 },
          ],
        };

        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(1);
        expect(result.updatedIds).toEqual(['bp-001']);
      });

      it('should handle minimum confidence score', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 0 },
            { id: 'bp-002', confidence: 0 },
          ],
        };

        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(2);
      });

      it('should handle maximum confidence score', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 1.0 },
          ],
        };

        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(1);
      });

      it('should handle maximum allowed updates', async () => {
        // Arrange
        const updates = Array(100).fill(0).map((_, i) => ({
          id: `bp-${i.toString().padStart(3, '0')}`,
          confidence: 0.9,
        }));
        const input = { updates };

        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Act
        const result = await useCase.execute(input);

        // Assert
        expect(result.totalUpdated).toBe(100);
        expect(result.updatedIds).toHaveLength(100);
      });
    });

    describe('異常系', () => {
      describe('Updates validation', () => {
        it('should throw when updates is not an array', async () => {
          // Arrange
          const input = {
            updates: 'not-an-array' as any,
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Updates must be an array'),
          );
        });

        it('should throw when updates array is empty', async () => {
          // Arrange
          const input = {
            updates: [],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('At least one update is required for bulk update'),
          );
        });

        it('should throw when updates exceeds limit', async () => {
          // Arrange
          const updates = Array(101).fill(0).map((_, i) => ({
            id: `bp-${i.toString().padStart(3, '0')}`,
            confidence: 0.9,
          }));
          const input = { updates };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Cannot update more than 100 best practices at once'),
          );
        });

        it('should throw when an ID is empty', async () => {
          // Arrange
          const input = {
            updates: [
              { id: 'bp-001', confidence: 0.9 },
              { id: '', confidence: 0.9 },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Best practice ID cannot be empty'),
          );
        });

        it('should throw when ID format is invalid', async () => {
          // Arrange
          const input = {
            updates: [
              { id: 'invalid-id-format', confidence: 0.9 },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Invalid best practice ID format'),
          );
        });

        it('should throw when IDs contain duplicates', async () => {
          // Arrange
          const input = {
            updates: [
              { id: 'bp-001', confidence: 0.9 },
              { id: 'bp-002', confidence: 0.8 },
              { id: 'bp-001', confidence: 0.7 },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Duplicate IDs are not allowed'),
          );
        });
      });

      describe('Confidence validation', () => {
        it('should throw when confidence score is out of range', async () => {
          // Arrange
          const invalidScores = [-0.1, 1.1, 2.0];

          for (const score of invalidScores) {
            const input = {
              updates: [
                { id: 'bp-001', confidence: score },
              ],
            };

            // Act & Assert
            await expect(useCase.execute(input)).rejects.toThrow(
              new DomainException('Confidence score must be between 0 and 1'),
            );
          }
        });

        it('should throw when confidence score is not a number', async () => {
          // Arrange
          const input = {
            updates: [
              { id: 'bp-001', confidence: 'not-a-number' as any },
            ],
          };

          // Act & Assert
          await expect(useCase.execute(input)).rejects.toThrow(
            new DomainException('Confidence score must be a number'),
          );
        });
      });

      it('should propagate service errors', async () => {
        // Arrange
        const input = {
          updates: [
            { id: 'bp-001', confidence: 0.9 },
          ],
        };

        const serviceError = new Error('Database connection failed');
        knowledgeBaseManagerService.bulkUpdateBestPractices.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(input)).rejects.toThrow('Database connection failed');
      });
    });

    describe('境界値テスト', () => {
      it('should accept confidence score at boundaries', async () => {
        // Arrange
        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Minimum valid
        await expect(useCase.execute({
          updates: [
            { id: 'bp-001', confidence: 0 },
          ],
        })).resolves.toBeDefined();

        // Maximum valid
        await expect(useCase.execute({
          updates: [
            { id: 'bp-001', confidence: 1 },
          ],
        })).resolves.toBeDefined();
      });

      it('should accept maximum number of updates', async () => {
        // Arrange
        knowledgeBaseManagerService.bulkUpdateBestPractices.mockResolvedValue(undefined);

        // Exactly 100 updates (max allowed)
        const updates = Array(100).fill(0).map((_, i) => ({
          id: `bp-${i.toString().padStart(3, '0')}`,
          confidence: 0.5,
        }));

        await expect(useCase.execute({ updates })).resolves.toBeDefined();
      });
    });
  });
});