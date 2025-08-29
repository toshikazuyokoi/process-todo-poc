import { Test, TestingModule } from '@nestjs/testing';
import { DeleteProcessTypeUseCase } from '../delete-process-type.usecase';
import { KnowledgeBaseManagerService } from '../../../../domain/services/knowledge-base-manager.service';
import { DomainException } from '../../../../domain/exceptions/domain.exception';

describe('DeleteProcessTypeUseCase', () => {
  let useCase: DeleteProcessTypeUseCase;
  let knowledgeBaseManagerService: jest.Mocked<KnowledgeBaseManagerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProcessTypeUseCase,
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

    useCase = module.get<DeleteProcessTypeUseCase>(DeleteProcessTypeUseCase);
    knowledgeBaseManagerService = module.get(KnowledgeBaseManagerService);
  });

  describe('execute', () => {
    describe('正常系', () => {
      it('should delete a process type successfully', async () => {
        // Arrange
        const id = 'proc-001';
        knowledgeBaseManagerService.deleteProcessType.mockResolvedValue(undefined);

        // Act
        await useCase.execute(id);

        // Assert
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledWith(id);
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledTimes(1);
      });

      it('should delete another process type successfully', async () => {
        // Arrange
        const id = 'proc-999';
        knowledgeBaseManagerService.deleteProcessType.mockResolvedValue(undefined);

        // Act
        await useCase.execute(id);

        // Assert
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledWith(id);
      });

      it('should handle multiple sequential deletes', async () => {
        // Arrange
        const ids = ['proc-001', 'proc-002', 'proc-003'];
        knowledgeBaseManagerService.deleteProcessType.mockResolvedValue(undefined);

        // Act
        for (const id of ids) {
          await useCase.execute(id);
        }

        // Assert
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledTimes(3);
        ids.forEach((id) => {
          expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledWith(id);
        });
      });
    });

    describe('異常系', () => {
      it('should throw when ID is empty', async () => {
        // Act & Assert
        await expect(useCase.execute('')).rejects.toThrow(
          new DomainException('Process type ID is required'),
        );
        expect(knowledgeBaseManagerService.deleteProcessType).not.toHaveBeenCalled();
      });

      it('should throw when ID is null', async () => {
        // Act & Assert
        await expect(useCase.execute(null as any)).rejects.toThrow(
          new DomainException('Process type ID is required'),
        );
        expect(knowledgeBaseManagerService.deleteProcessType).not.toHaveBeenCalled();
      });

      it('should throw when ID is undefined', async () => {
        // Act & Assert
        await expect(useCase.execute(undefined as any)).rejects.toThrow(
          new DomainException('Process type ID is required'),
        );
        expect(knowledgeBaseManagerService.deleteProcessType).not.toHaveBeenCalled();
      });

      it('should throw when ID format is invalid', async () => {
        // Arrange
        const invalidIds = [
          'invalid-format',
          'PROC-001', // Wrong prefix case
          'pr-001',   // Wrong prefix
          'proc001',  // Missing hyphen
          'proc-',    // Missing number
          '-001',     // Missing prefix
        ];

        // Act & Assert
        for (const id of invalidIds) {
          await expect(useCase.execute(id)).rejects.toThrow(
            new DomainException('Invalid process type ID format'),
          );
          expect(knowledgeBaseManagerService.deleteProcessType).not.toHaveBeenCalled();
        }
      });

      it('should throw when ID is not a string', async () => {
        // Arrange
        const invalidInputs = [
          123,
          { id: 'proc-001' },
          ['proc-001'],
          true,
        ];

        // Act & Assert
        for (const input of invalidInputs) {
          await expect(useCase.execute(input as any)).rejects.toThrow(
            new DomainException('Process type ID must be a string'),
          );
          expect(knowledgeBaseManagerService.deleteProcessType).not.toHaveBeenCalled();
        }
      });

      it('should propagate service errors when process type not found', async () => {
        // Arrange
        const id = 'proc-999';
        const serviceError = new Error('Process type not found');
        knowledgeBaseManagerService.deleteProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id)).rejects.toThrow('Process type not found');
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledWith(id);
      });

      it('should propagate database errors', async () => {
        // Arrange
        const id = 'proc-001';
        const serviceError = new Error('Database connection failed');
        knowledgeBaseManagerService.deleteProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id)).rejects.toThrow('Database connection failed');
      });

      it('should propagate constraint violation errors', async () => {
        // Arrange
        const id = 'proc-001';
        const serviceError = new Error('Cannot delete: process type is referenced by active cases');
        knowledgeBaseManagerService.deleteProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id)).rejects.toThrow(
          'Cannot delete: process type is referenced by active cases',
        );
      });
    });

    describe('並行処理テスト', () => {
      it('should handle concurrent delete attempts for the same ID', async () => {
        // Arrange
        const id = 'proc-001';
        let isDeleting = false;
        let isDeleted = false;
        
        knowledgeBaseManagerService.deleteProcessType.mockImplementation(async () => {
          if (isDeleted) {
            // Already deleted
            throw new Error('Process type not found');
          }
          if (isDeleting) {
            // Wait for the first deletion to complete
            await new Promise(resolve => setTimeout(resolve, 20));
            // Check again after waiting
            if (isDeleted) {
              throw new Error('Process type not found');
            }
          }
          isDeleting = true;
          // Simulate deletion time
          await new Promise(resolve => setTimeout(resolve, 10));
          isDeleted = true;
          isDeleting = false;
          return undefined;
        });

        // Act
        const promise1 = useCase.execute(id);
        const promise2 = useCase.execute(id);

        // Assert
        const results = await Promise.allSettled([promise1, promise2]);
        
        // One should succeed, one should fail
        const successes = results.filter(r => r.status === 'fulfilled');
        const failures = results.filter(r => r.status === 'rejected');
        
        expect(successes).toHaveLength(1);
        expect(failures).toHaveLength(1);
        if (failures[0].status === 'rejected') {
          expect(failures[0].reason.message).toBe('Process type not found');
        }
      });

      it('should handle concurrent deletes for different IDs', async () => {
        // Arrange
        const ids = ['proc-001', 'proc-002', 'proc-003'];
        knowledgeBaseManagerService.deleteProcessType.mockResolvedValue(undefined);

        // Act
        const promises = ids.map(id => useCase.execute(id));
        await Promise.all(promises);

        // Assert
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledTimes(3);
        ids.forEach(id => {
          expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledWith(id);
        });
      });
    });

    describe('エラーリカバリテスト', () => {
      it('should not retry on failure', async () => {
        // Arrange
        const id = 'proc-001';
        const serviceError = new Error('Database error');
        knowledgeBaseManagerService.deleteProcessType.mockRejectedValue(serviceError);

        // Act & Assert
        await expect(useCase.execute(id)).rejects.toThrow('Database error');
        
        // Verify it was called only once (no retry)
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledTimes(1);
      });

      it('should maintain state consistency after error', async () => {
        // Arrange
        const id1 = 'proc-001';
        const id2 = 'proc-002';
        
        knowledgeBaseManagerService.deleteProcessType
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce(undefined);

        // Act & Assert
        // First call fails
        await expect(useCase.execute(id1)).rejects.toThrow('Temporary error');
        
        // Second call should work normally
        await expect(useCase.execute(id2)).resolves.toBeUndefined();
        
        expect(knowledgeBaseManagerService.deleteProcessType).toHaveBeenCalledTimes(2);
      });
    });
  });
});