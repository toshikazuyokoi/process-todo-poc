import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataEncryptionService, EncryptedData } from './data-encryption.service';
import * as crypto from 'crypto';

describe('DataEncryptionService', () => {
  let service: DataEncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataEncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                ENCRYPTION_MASTER_KEY: 'test-master-key-32-chars-long!!!',
                ENCRYPTION_ALGORITHM: 'aes-256-gcm',
                ENCRYPTION_KEY_LENGTH: 32,
                ENCRYPTION_ITERATIONS: 1000, // Lower for testing
                ENCRYPTION_SALT_LENGTH: 32,
                ENCRYPTION_IV_LENGTH: 16,
                ENCRYPTION_TAG_LENGTH: 16,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DataEncryptionService>(DataEncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('encrypt', () => {
    it('should encrypt string data', async () => {
      const plaintext = 'sensitive data';
      const encrypted = await service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.tag).toBeTruthy();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.version).toBe(1);
      expect(encrypted.data).not.toBe(plaintext);
    });

    it('should encrypt object data', async () => {
      const data = { username: 'testuser', password: 'secret123' };
      const encrypted = await service.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeTruthy();
      expect(encrypted.data).not.toContain('testuser');
      expect(encrypted.data).not.toContain('secret123');
    });

    it('should use custom encryption options', async () => {
      const plaintext = 'test data';
      const encrypted = await service.encrypt(plaintext, {
        algorithm: 'aes-256-cbc',
        iterations: 500,
      });

      expect(encrypted.algorithm).toBe('aes-256-cbc');
      expect(encrypted.tag).toBeUndefined(); // CBC doesn't use auth tag
    });

    it('should generate different encrypted data for same input', async () => {
      const plaintext = 'same data';
      const encrypted1 = await service.encrypt(plaintext);
      const encrypted2 = await service.encrypt(plaintext);

      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
    });

    it('should handle empty string', async () => {
      const encrypted = await service.encrypt('');
      expect(encrypted).toBeDefined();
      expect(encrypted.data).toBeTruthy();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted string data', async () => {
      const plaintext = 'sensitive data';
      const encrypted = await service.encrypt(plaintext);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt encrypted object data', async () => {
      const data = { username: 'testuser', password: 'secret123' };
      const encrypted = await service.encrypt(data);
      const decrypted = await service.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(data);
    });

    it('should fail with incorrect data', async () => {
      const encrypted = await service.encrypt('test data');
      
      // Tamper with encrypted data
      const tampered: EncryptedData = {
        ...encrypted,
        data: Buffer.from('tampered').toString('base64'),
      };

      await expect(service.decrypt(tampered)).rejects.toThrow('Failed to decrypt data');
    });

    it('should fail with unsupported version', async () => {
      const encrypted = await service.encrypt('test data');
      const futureVersion: EncryptedData = {
        ...encrypted,
        version: 999,
      };

      await expect(service.decrypt(futureVersion)).rejects.toThrow('Unsupported encryption version');
    });

    it('should handle authentication tag verification', async () => {
      const plaintext = 'secure data';
      const encrypted = await service.encrypt(plaintext);
      
      // Tamper with auth tag
      const tampered: EncryptedData = {
        ...encrypted,
        tag: Buffer.from('wrong-tag').toString('base64'),
      };

      await expect(service.decrypt(tampered)).rejects.toThrow();
    });
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields in object', async () => {
      const obj = {
        id: 1,
        username: 'user123',
        password: 'secret',
        email: 'user@example.com',
      };

      const encrypted = await service.encryptFields(obj, ['password', 'email']);

      expect(encrypted.id).toBe(1);
      expect(encrypted.username).toBe('user123');
      expect(encrypted.password).toHaveProperty('data');
      expect(encrypted.password).toHaveProperty('iv');
      expect(encrypted.email).toHaveProperty('data');
    });

    it('should handle missing fields gracefully', async () => {
      const obj: any = { id: 1, username: 'user123' };
      const encrypted = await service.encryptFields(obj, ['password', 'email']);

      expect(encrypted.id).toBe(1);
      expect(encrypted.username).toBe('user123');
      expect(encrypted.password).toBeUndefined();
      expect(encrypted.email).toBeUndefined();
    });

    it('should handle null values', async () => {
      const obj = { id: 1, password: null };
      const encrypted = await service.encryptFields(obj, ['password']);

      expect(encrypted.password).toBeNull();
    });
  });

  describe('decryptFields', () => {
    it('should decrypt encrypted fields', async () => {
      const original = {
        id: 1,
        username: 'user123',
        password: 'secret',
        email: 'user@example.com',
      };

      const encrypted = await service.encryptFields(original, ['password', 'email']);
      const decrypted = await service.decryptFields(encrypted, ['password', 'email']);

      expect(decrypted.id).toBe(1);
      expect(decrypted.username).toBe('user123');
      expect(decrypted.password).toBe('secret');
      expect(decrypted.email).toBe('user@example.com');
    });

    it('should handle JSON data in fields', async () => {
      const obj = {
        id: 1,
        metadata: { key: 'value', nested: { data: 'test' } },
      };

      const encrypted = await service.encryptFields(obj, ['metadata']);
      const decrypted = await service.decryptFields(encrypted, ['metadata']);

      expect(decrypted.metadata).toEqual(obj.metadata);
    });

    it('should keep field encrypted if decryption fails', async () => {
      const obj = {
        id: 1,
        password: { invalid: 'encrypted', data: 'format' },
      };

      const result = await service.decryptFields(obj, ['password']);
      expect(result.password).toEqual({ invalid: 'encrypted', data: 'format' });
    });
  });

  describe('hash', () => {
    it('should generate consistent hash for same data', () => {
      const data = 'test data';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should generate different hash for different data', () => {
      const hash1 = service.hash('data1');
      const hash2 = service.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should support different algorithms', () => {
      const data = 'test';
      const sha256 = service.hash(data, 'sha256');
      const sha512 = service.hash(data, 'sha512');

      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128);
      expect(sha256).not.toBe(sha512);
    });
  });

  describe('verifyHash', () => {
    it('should verify correct hash', () => {
      const data = 'test data';
      const hash = service.hash(data);

      expect(service.verifyHash(data, hash)).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const data = 'test data';
      const hash = service.hash('different data');

      expect(service.verifyHash(data, hash)).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const data = 'test';
      const correctHash = service.hash(data);
      const incorrectHash = correctHash.slice(0, -1) + 'x';

      expect(service.verifyHash(data, incorrectHash)).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate random token of specified length', () => {
      const token1 = service.generateToken(32);
      const token2 = service.generateToken(32);

      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('should use default length', () => {
      const token = service.generateToken();
      expect(token).toHaveLength(64);
    });

    it('should generate different tokens each time', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(service.generateToken(16));
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('encryptPrompt', () => {
    it('should encrypt prompt with metadata', async () => {
      const prompt = 'Generate a summary';
      const metadata = { userId: '123', model: 'gpt-4' };

      const encrypted = await service.encryptPrompt(prompt, metadata);
      const decrypted = await service.decryptPrompt(encrypted);

      expect(decrypted.prompt).toBe(prompt);
      expect(decrypted.metadata).toEqual(metadata);
      expect(decrypted.timestamp).toBeDefined();
    });

    it('should encrypt prompt without metadata', async () => {
      const prompt = 'Generate code';

      const encrypted = await service.encryptPrompt(prompt);
      const decrypted = await service.decryptPrompt(encrypted);

      expect(decrypted.prompt).toBe(prompt);
      expect(decrypted.metadata).toBeUndefined();
    });
  });

  describe('encryptCredentials', () => {
    it('should encrypt credentials with higher security', async () => {
      const credentials = {
        apiKey: 'sk-1234567890',
        apiSecret: 'secret-key',
      };

      const encrypted = await service.encryptCredentials(credentials);
      expect(encrypted.algorithm).toBe('aes-256-gcm');

      const decrypted = await service.decryptCredentials(encrypted);
      expect(decrypted).toEqual(credentials);
    });
  });

  describe('rotateKeys', () => {
    it('should re-encrypt data with new settings', async () => {
      const plaintext = 'sensitive data';
      const encrypted = await service.encrypt(plaintext);

      const rotated = await service.rotateKeys(encrypted, {
        iterations: 2000,
      });

      expect(rotated.data).not.toBe(encrypted.data);
      expect(rotated.salt).not.toBe(encrypted.salt);

      const decrypted = await service.decrypt(rotated);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('checkHealth', () => {
    it('should report healthy encryption service', async () => {
      const health = await service.checkHealth();

      expect(health.healthy).toBe(true);
      expect(health.algorithm).toBe('aes-256-gcm');
      expect(health.keyConfigured).toBe(true);
    });

    it('should detect missing master key', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'ENCRYPTION_MASTER_KEY') return '';
        return defaultValue;
      });

      const newService = new DataEncryptionService(configService);
      const health = await newService.checkHealth();

      expect(health.keyConfigured).toBe(false);
    });

    it('should handle encryption errors', async () => {
      // Mock encrypt to throw error
      jest.spyOn(service as any, 'encrypt').mockRejectedValue(new Error('Encryption failed'));

      const health = await service.checkHealth();

      expect(health.healthy).toBe(false);
      expect(health.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('edge cases', () => {
    it('should handle very long strings', async () => {
      const longString = 'x'.repeat(10000);
      const encrypted = await service.encrypt(longString);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(longString);
    });

    it('should handle special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      const encrypted = await service.encrypt(specialChars);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(specialChars);
    });

    it('should handle unicode characters', async () => {
      const unicode = '你好世界 🌍 مرحبا بالعالم';
      const encrypted = await service.encrypt(unicode);
      const decrypted = await service.decrypt(encrypted);

      expect(decrypted).toBe(unicode);
    });

    it('should handle nested objects', async () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              data: 'deep value',
              array: [1, 2, 3],
            },
          },
        },
      };

      const encrypted = await service.encrypt(nested);
      const decrypted = await service.decrypt(encrypted);

      expect(JSON.parse(decrypted)).toEqual(nested);
    });
  });
});