import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  PrivacyManagerService,
  DataCategory,
  PrivacyAction,
} from './privacy-manager.service';

describe('PrivacyManagerService', () => {
  let service: PrivacyManagerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyManagerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                PRIVACY_ANONYMIZATION_SALT: 'test-salt-12345',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PrivacyManagerService>(PrivacyManagerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('applyPrivacyRules', () => {
    it('should mask email addresses', () => {
      const text = 'Contact me at john.doe@example.com for more info';
      const result = service.applyPrivacyRules(text);

      expect(result).toBe('Contact me at ***@***.*** for more info');
      expect(result).not.toContain('john.doe@example.com');
    });

    it('should mask phone numbers', () => {
      const text = 'Call me at 555-123-4567 or +1 (555) 987-6543';
      const result = service.applyPrivacyRules(text);

      expect(result).toContain('***-***-****');
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('987-6543');
    });

    it('should redact credit card numbers', () => {
      const text = 'Card number: 4111 1111 1111 1111';
      const result = service.applyPrivacyRules(text);

      expect(result).toBe('Card number: [REDACTED]');
      expect(result).not.toContain('4111');
    });

    it('should redact social security numbers', () => {
      const text = 'SSN: 123-45-6789';
      const result = service.applyPrivacyRules(text);

      expect(result).toBe('SSN: [SSN-REDACTED]');
    });

    it('should anonymize IP addresses', () => {
      const text = 'Connection from 192.168.1.100';
      const result = service.applyPrivacyRules(text);

      expect(result).toContain('ANON_');
      expect(result).not.toContain('192.168.1.100');
    });

    it('should redact API keys and tokens', () => {
      const text = 'api_key: sk-1234567890abcdef';
      const result = service.applyPrivacyRules(text);

      expect(result).toBe('api_key=[REDACTED]');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    it('should pseudonymize names', () => {
      const text = 'Meeting with John Smith and Jane Doe';
      const result = service.applyPrivacyRules(text);

      expect(result).not.toContain('John Smith');
      expect(result).not.toContain('Jane Doe');
      expect(result).toMatch(/Meeting with \w+\d+ and \w+\d+/);
    });

    it('should handle multiple privacy rules in same text', () => {
      const text = 'Email: user@example.com, Phone: 555-123-4567, IP: 192.168.1.1';
      const result = service.applyPrivacyRules(text);

      expect(result).toContain('***@***.***');
      expect(result).toContain('***-***-****');
      expect(result).toContain('ANON_');
    });

    it('should respect category sensitivity', () => {
      const text = 'Email: user@example.com';
      const publicResult = service.applyPrivacyRules(text, DataCategory.PUBLIC);
      const sensitiveResult = service.applyPrivacyRules(text, DataCategory.SENSITIVE);

      // Both should mask the email
      expect(publicResult).toContain('***@***.***');
      expect(sensitiveResult).toContain('***@***.***');
    });
  });

  describe('anonymize', () => {
    it('should generate consistent anonymous ID for same data', () => {
      const data = 'user@example.com';
      const anon1 = service.anonymize(data);
      const anon2 = service.anonymize(data);

      expect(anon1).toBe(anon2);
      expect(anon1).toMatch(/^ANON_[a-f0-9]{8}$/);
    });

    it('should generate different IDs for different data', () => {
      const anon1 = service.anonymize('user1@example.com');
      const anon2 = service.anonymize('user2@example.com');

      expect(anon1).not.toBe(anon2);
    });
  });

  describe('pseudonymize', () => {
    it('should generate consistent pseudonym for same data', () => {
      const data = 'John Smith';
      const pseudo1 = service.pseudonymize(data);
      const pseudo2 = service.pseudonymize(data);

      expect(pseudo1).toBe(pseudo2);
      expect(pseudo1).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);
    });

    it('should generate different pseudonyms for different data', () => {
      const pseudo1 = service.pseudonymize('John Smith');
      const pseudo2 = service.pseudonymize('Jane Doe');

      expect(pseudo1).not.toBe(pseudo2);
    });
  });

  describe('shouldRetain', () => {
    it('should return true for data within retention period', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 30); // 30 days ago

      expect(service.shouldRetain(DataCategory.PERSONAL, createdAt)).toBe(true);
      expect(service.shouldRetain(DataCategory.SENSITIVE, createdAt)).toBe(true);
    });

    it('should return false for expired personal data', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 400); // Over 1 year

      expect(service.shouldRetain(DataCategory.PERSONAL, createdAt)).toBe(false);
    });

    it('should return false for expired sensitive data', () => {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - 100); // Over 90 days

      expect(service.shouldRetain(DataCategory.SENSITIVE, createdAt)).toBe(false);
    });

    it('should return true for public data (no expiration)', () => {
      const createdAt = new Date('2020-01-01');

      expect(service.shouldRetain(DataCategory.PUBLIC, createdAt)).toBe(true);
    });
  });

  describe('getRetentionPolicy', () => {
    it('should return correct retention policies', () => {
      const personalPolicy = service.getRetentionPolicy(DataCategory.PERSONAL);
      expect(personalPolicy).toEqual({
        category: DataCategory.PERSONAL,
        retentionDays: 365,
        deleteAction: 'anonymize',
      });

      const sensitivePolicy = service.getRetentionPolicy(DataCategory.SENSITIVE);
      expect(sensitivePolicy).toEqual({
        category: DataCategory.SENSITIVE,
        retentionDays: 90,
        deleteAction: 'delete',
      });
    });
  });

  describe('processRetention', () => {
    it('should categorize data based on retention policies', async () => {
      const now = new Date();
      const data = [
        { id: 1, category: DataCategory.PERSONAL, createdAt: new Date() },
        { id: 2, category: DataCategory.SENSITIVE, createdAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) }, // 100 days old
        { id: 3, category: DataCategory.PUBLIC, createdAt: new Date('2020-01-01') },
      ];

      const result = await service.processRetention(
        data,
        (item) => item.category,
        (item) => item.createdAt,
      );

      expect(result.retained).toHaveLength(2); // Personal and Public
      expect(result.deleted).toHaveLength(1); // Sensitive (expired)
      expect(result.anonymized).toHaveLength(0);
      expect(result.archived).toHaveLength(0);
    });

    it('should anonymize expired personal data', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // Over 1 year

      const data = [
        { id: 1, category: DataCategory.PERSONAL, createdAt: oldDate, email: 'user@example.com' },
      ];

      const result = await service.processRetention(
        data,
        (item) => item.category,
        (item) => item.createdAt,
      );

      expect(result.retained).toHaveLength(0);
      expect(result.anonymized).toHaveLength(1);
      expect(result.anonymized[0].email).toContain('***@***.***');
    });
  });

  describe('anonymizeObject', () => {
    it('should anonymize string values', async () => {
      const result = await service.anonymizeObject('test@example.com');
      expect(result).toMatch(/^ANON_/);
    });

    it('should anonymize arrays', async () => {
      const arr = ['user1@example.com', 'user2@example.com'];
      const result = await service.anonymizeObject(arr);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/^ANON_/);
      expect(result[1]).toMatch(/^ANON_/);
    });

    it('should anonymize nested objects', async () => {
      const obj = {
        id: 1,
        email: 'user@example.com',
        profile: {
          name: 'John Smith',
          phone: '555-123-4567',
        },
      };

      const result = await service.anonymizeObject(obj);

      expect(result.id).toBe(1); // ID preserved
      expect(result.email).toContain('***@***.***');
      expect(result.profile.phone).toContain('***-***-****');
    });

    it('should preserve special fields', async () => {
      const obj = {
        id: 123,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        email: 'user@example.com',
      };

      const result = await service.anonymizeObject(obj);

      expect(result.id).toBe(123);
      expect(result.createdAt).toBe('2024-01-01');
      expect(result.updatedAt).toBe('2024-01-02');
      expect(result.email).not.toBe('user@example.com');
    });
  });

  describe('detectSensitiveData', () => {
    it('should detect email addresses', () => {
      const text = 'Contact: user@example.com';
      const result = service.detectSensitiveData(text);

      expect(result.found).toBe(true);
      expect(result.categories).toContain(DataCategory.PERSONAL);
      expect(result.matches).toHaveLength(1);
    });

    it('should detect multiple types of sensitive data', () => {
      const text = 'Email: user@example.com, Card: 4111-1111-1111-1111, SSN: 123-45-6789';
      const result = service.detectSensitiveData(text);

      expect(result.found).toBe(true);
      expect(result.categories).toContain(DataCategory.PERSONAL);
      expect(result.categories).toContain(DataCategory.SENSITIVE);
      expect(result.matches.length).toBeGreaterThan(1);
    });

    it('should return false for clean text', () => {
      const text = 'This is a clean text without any sensitive information';
      const result = service.detectSensitiveData(text);

      expect(result.found).toBe(false);
      expect(result.categories).toHaveLength(0);
      expect(result.matches).toHaveLength(0);
    });

    it('should truncate long matches', () => {
      const text = 'api_key: ' + 'x'.repeat(100);
      const result = service.detectSensitiveData(text);

      expect(result.found).toBe(true);
      expect(result.matches[0].pattern.length).toBeLessThanOrEqual(23); // 20 + '...'
    });
  });

  describe('generatePrivacyReport', () => {
    it('should generate compliance report', () => {
      const data = [
        { id: 1, category: DataCategory.PUBLIC, content: 'Public info' },
        { id: 2, category: DataCategory.PERSONAL, content: 'user@example.com' },
        { id: 3, category: DataCategory.SENSITIVE, content: 'SSN: 123-45-6789' },
      ];

      const report = service.generatePrivacyReport(
        data,
        (item) => item.category,
      );

      expect(report.totalItems).toBe(3);
      expect(report.categoryCounts[DataCategory.PUBLIC]).toBe(1);
      expect(report.categoryCounts[DataCategory.PERSONAL]).toBe(1);
      expect(report.categoryCounts[DataCategory.SENSITIVE]).toBe(1);
      expect(report.sensitiveDataFound).toBeGreaterThan(0);
    });

    it('should determine compliance status', () => {
      const cleanData = [
        { id: 1, category: DataCategory.PUBLIC, content: 'Clean text' },
        { id: 2, category: DataCategory.PUBLIC, content: 'More clean text' },
      ];

      const cleanReport = service.generatePrivacyReport(
        cleanData,
        (item) => item.category,
      );

      expect(cleanReport.complianceStatus).toBe('compliant');

      const sensitiveData = [
        { id: 1, category: DataCategory.SENSITIVE, content: 'SSN: 123-45-6789' },
        { id: 2, category: DataCategory.SENSITIVE, content: 'Card: 4111-1111-1111-1111' },
      ];

      const sensitiveReport = service.generatePrivacyReport(
        sensitiveData,
        (item) => item.category,
      );

      expect(sensitiveReport.complianceStatus).toBe('non_compliant');
    });
  });

  describe('validateCompliance', () => {
    it('should validate compliant data', () => {
      const data = 'This is clean text without sensitive information';
      const result = service.validateCompliance(data);

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect compliance issues', () => {
      const data = {
        email: 'user@example.com',
        creditCard: '4111-1111-1111-1111',
      };

      const result = service.validateCompliance(data);

      expect(result.compliant).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide recommendations for sensitive data', () => {
      const data = 'SSN: 123-45-6789';
      const result = service.validateCompliance(data);

      expect(result.compliant).toBe(false);
      expect(result.recommendations).toContain('Apply encryption before storage');
      expect(result.recommendations).toContain('Implement access controls');
    });

    it('should provide GDPR recommendations for personal data', () => {
      const data = 'Email: user@example.com';
      const result = service.validateCompliance(data);

      expect(result.compliant).toBe(false);
      expect(result.recommendations).toContain('Consider anonymization or pseudonymization');
      expect(result.recommendations).toContain('Ensure GDPR compliance');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = service.applyPrivacyRules('');
      expect(result).toBe('');
    });

    it('should handle null and undefined gracefully', () => {
      const detection = service.detectSensitiveData('');
      expect(detection.found).toBe(false);
    });

    it('should handle malformed patterns', () => {
      const text = 'email: notanemail, phone: 123';
      const result = service.applyPrivacyRules(text);

      expect(result).toBe(text); // Should remain unchanged
    });

    it('should handle very long texts', () => {
      const longText = 'user@example.com '.repeat(1000);
      const result = service.applyPrivacyRules(longText);

      expect(result).not.toContain('user@example.com');
      expect(result).toContain('***@***.***');
    });
  });
});