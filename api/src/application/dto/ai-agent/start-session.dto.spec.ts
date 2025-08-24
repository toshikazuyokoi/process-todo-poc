import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { StartSessionDto } from './start-session.dto';

describe('StartSessionDto', () => {
  let dto: StartSessionDto;

  beforeEach(() => {
    dto = new StartSessionDto();
  });

  describe('正常系バリデーション', () => {
    it('should pass validation with valid data', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: 'アジャイル開発',
        goal: '開発プロセスの効率化と品質向上',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept minimum length strings', async () => {
      // Arrange
      const plainDto = {
        industry: 'IT',
        processType: 'Dev',
        goal: 'Goal',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept maximum length strings', async () => {
      // Arrange
      const plainDto = {
        industry: 'a'.repeat(100),
        processType: 'b'.repeat(100),
        goal: 'c'.repeat(500),
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept Japanese characters', async () => {
      // Arrange
      const plainDto = {
        industry: '製造業・自動車部品製造',
        processType: '品質管理・検査プロセス',
        goal: '不良品率の削減と検査効率の向上を目指す',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept English characters', async () => {
      // Arrange
      const plainDto = {
        industry: 'Software Development',
        processType: 'Agile Scrum Process',
        goal: 'Improve team velocity and reduce bugs',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept mixed language input', async () => {
      // Arrange
      const plainDto = {
        industry: 'IT・ソフトウェア',
        processType: 'DevOps開発プロセス',
        goal: 'CI/CDパイプラインの改善',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should accept special characters and numbers', async () => {
      // Arrange
      const plainDto = {
        industry: 'Industry-123',
        processType: 'Process_Type#2',
        goal: 'Goal @2024 & improvements',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe('異常系バリデーション - 必須フィールド', () => {
    it('should fail when industry is missing', async () => {
      // Arrange
      const plainDto = {
        processType: 'アジャイル開発',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('industry');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when processType is missing', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('processType');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when goal is missing', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: 'アジャイル開発',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('goal');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when all fields are missing', async () => {
      // Arrange
      const plainDto = {};
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(3);
      const propertyNames = errors.map(e => e.property);
      expect(propertyNames).toContain('industry');
      expect(propertyNames).toContain('processType');
      expect(propertyNames).toContain('goal');
    });
  });

  describe('異常系バリデーション - 空文字列', () => {
    it('should fail when industry is empty string', async () => {
      // Arrange
      const plainDto = {
        industry: '',
        processType: 'アジャイル開発',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('industry');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when processType is empty string', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: '',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('processType');
    });

    it('should fail when goal is empty string', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: 'アジャイル開発',
        goal: '',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('goal');
    });

    it('should fail when fields contain only whitespace', async () => {
      // Arrange
      const plainDto = {
        industry: '   ',
        processType: '\t\n',
        goal: '  \r\n  ',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(3);
    });
  });

  describe('異常系バリデーション - 文字数制限', () => {
    it('should fail when industry exceeds 100 characters', async () => {
      // Arrange
      const plainDto = {
        industry: 'a'.repeat(101),
        processType: 'アジャイル開発',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('industry');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail when processType exceeds 100 characters', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: 'b'.repeat(101),
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('processType');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail when goal exceeds 500 characters', async () => {
      // Arrange
      const plainDto = {
        industry: 'ソフトウェア開発',
        processType: 'アジャイル開発',
        goal: 'c'.repeat(501),
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('goal');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail when all fields exceed limits', async () => {
      // Arrange
      const plainDto = {
        industry: 'a'.repeat(101),
        processType: 'b'.repeat(101),
        goal: 'c'.repeat(501),
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(3);
    });
  });

  describe('異常系バリデーション - 型の不正', () => {
    it('should fail when industry is not a string', async () => {
      // Arrange
      const plainDto: any = {
        industry: 123,
        processType: 'アジャイル開発',
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const industryError = errors.find(e => e.property === 'industry');
      expect(industryError).toBeDefined();
    });

    it('should fail when processType is not a string', async () => {
      // Arrange
      const plainDto: any = {
        industry: 'ソフトウェア開発',
        processType: { type: 'agile' },
        goal: '効率化',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const processTypeError = errors.find(e => e.property === 'processType');
      expect(processTypeError).toBeDefined();
    });

    it('should fail when goal is not a string', async () => {
      // Arrange
      const plainDto: any = {
        industry: 'ソフトウェア開発',
        processType: 'アジャイル開発',
        goal: ['goal1', 'goal2'],
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const goalError = errors.find(e => e.property === 'goal');
      expect(goalError).toBeDefined();
    });

    it('should fail when fields are null', async () => {
      // Arrange
      const plainDto: any = {
        industry: null,
        processType: null,
        goal: null,
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(3);
    });

    it('should fail when fields are undefined', async () => {
      // Arrange
      const plainDto: any = {
        industry: undefined,
        processType: undefined,
        goal: undefined,
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(3);
    });
  });

  describe('エッジケース', () => {
    it('should handle boundary values correctly', async () => {
      // Arrange - exactly at limits
      const plainDto = {
        industry: 'a'.repeat(100),
        processType: 'b'.repeat(100),
        goal: 'c'.repeat(500),
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode characters correctly', async () => {
      // Arrange
      const plainDto = {
        industry: '🏭製造業',
        processType: '⚙️プロセス',
        goal: '📈向上',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should handle multi-byte characters in length validation', async () => {
      // Arrange - Japanese characters (multi-byte)
      const plainDto = {
        industry: 'あ'.repeat(100), // Should be OK
        processType: 'い'.repeat(100),
        goal: 'う'.repeat(500),
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should trim whitespace before validation', async () => {
      // Arrange
      const plainDto = {
        industry: '  ソフトウェア開発  ',
        processType: '\tアジャイル開発\n',
        goal: ' 効率化 ',
      };
      dto = plainToInstance(StartSessionDto, plainDto);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });
});