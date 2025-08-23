import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptionOptions {
  algorithm?: string;
  keyDerivation?: 'pbkdf2' | 'scrypt';
  iterations?: number;
  saltLength?: number;
  ivLength?: number;
  tagLength?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
  tag?: string;
  algorithm: string;
  version: number;
  iterations?: number;
}

/**
 * Data Encryption Service
 * Handles encryption and decryption of sensitive AI data
 */
@Injectable()
export class DataEncryptionService {
  private readonly logger = new Logger(DataEncryptionService.name);
  private readonly masterKey: string;
  private readonly defaultAlgorithm: string;
  private readonly defaultKeyLength: number;
  private readonly defaultIterations: number;
  private readonly defaultSaltLength: number;
  private readonly defaultIvLength: number;
  private readonly defaultTagLength: number;
  private readonly currentVersion: number = 1;

  constructor(private readonly configService: ConfigService) {
    this.masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY', '');
    this.defaultAlgorithm = this.configService.get<string>('ENCRYPTION_ALGORITHM', 'aes-256-gcm');
    this.defaultKeyLength = this.configService.get<number>('ENCRYPTION_KEY_LENGTH', 32);
    this.defaultIterations = this.configService.get<number>('ENCRYPTION_ITERATIONS', 100000);
    this.defaultSaltLength = this.configService.get<number>('ENCRYPTION_SALT_LENGTH', 32);
    this.defaultIvLength = this.configService.get<number>('ENCRYPTION_IV_LENGTH', 16);
    this.defaultTagLength = this.configService.get<number>('ENCRYPTION_TAG_LENGTH', 16);

    if (!this.masterKey) {
      this.logger.warn('Master encryption key not configured. Using default key (NOT SECURE FOR PRODUCTION)');
    }
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string | object, options?: EncryptionOptions): Promise<EncryptedData> {
    try {
      const algorithm = options?.algorithm || this.defaultAlgorithm;
      const saltLength = options?.saltLength || this.defaultSaltLength;
      const ivLength = options?.ivLength || this.defaultIvLength;
      const iterations = options?.iterations || this.defaultIterations;

      // Convert object to string if necessary
      const plaintext = typeof data === 'object' ? JSON.stringify(data) : data;

      // Generate salt and IV
      const salt = crypto.randomBytes(saltLength);
      const iv = crypto.randomBytes(ivLength);

      // Derive key from master key and salt
      const key = await this.deriveKey(salt, iterations, options?.keyDerivation);

      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      // Encrypt data (handle empty string case)
      let encrypted: Buffer;
      if (plaintext === '') {
        // For empty string, still perform encryption
        encrypted = Buffer.concat([
          cipher.update(Buffer.from([])),
          cipher.final(),
        ]);
        // If still empty, use a special marker
        if (encrypted.length === 0) {
          encrypted = Buffer.from([0x00]);
        }
      } else {
        encrypted = Buffer.concat([
          cipher.update(plaintext, 'utf8'),
          cipher.final(),
        ]);
      }

      // Get authentication tag for GCM mode
      let tag: Buffer | undefined;
      if (algorithm.includes('gcm')) {
        tag = (cipher as any).getAuthTag();
      }

      return {
        data: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        tag: tag?.toString('base64'),
        algorithm,
        version: this.currentVersion,
        iterations,
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    try {
      // Check version compatibility
      if (encryptedData.version > this.currentVersion) {
        throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
      }

      // Decode from base64
      const encrypted = Buffer.from(encryptedData.data, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const tag = encryptedData.tag ? Buffer.from(encryptedData.tag, 'base64') : undefined;

      // Handle special empty string marker
      if (encrypted.length === 1 && encrypted[0] === 0x00) {
        return '';
      }

      // Derive key from master key and salt
      const key = await this.deriveKey(salt, encryptedData.iterations || this.defaultIterations);

      // Create decipher
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv);

      // Set authentication tag for GCM mode
      if (encryptedData.algorithm.includes('gcm') && tag) {
        (decipher as any).setAuthTag(tag);
      }

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      // Preserve original error message if it's a specific error
      if (error instanceof Error && error.message.includes('Unsupported encryption version')) {
        throw error;
      }
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt field-level data in an object
   */
  async encryptFields<T extends Record<string, any>>(
    obj: T,
    fields: string[],
    options?: EncryptionOptions,
  ): Promise<T> {
    const result = { ...obj } as any;

    for (const field of fields) {
      if (field in result && result[field] !== null && result[field] !== undefined) {
        const encrypted = await this.encrypt(result[field], options);
        result[field] = encrypted;
      }
    }

    return result as T;
  }

  /**
   * Decrypt field-level data in an object
   */
  async decryptFields<T extends Record<string, any>>(
    obj: T,
    fields: string[],
  ): Promise<T> {
    const result = { ...obj } as any;

    for (const field of fields) {
      if (field in result && result[field] && typeof result[field] === 'object') {
        try {
          const decrypted = await this.decrypt(result[field] as EncryptedData);
          
          // Try to parse as JSON if it looks like JSON
          if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
            try {
              result[field] = JSON.parse(decrypted);
            } catch {
              result[field] = decrypted;
            }
          } else {
            result[field] = decrypted;
          }
        } catch (error) {
          this.logger.error(`Failed to decrypt field: ${field}`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return result as T;
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, algorithm: string = 'sha256'): boolean {
    const dataHash = this.hash(data, algorithm);
    return crypto.timingSafeEqual(Buffer.from(dataHash), Buffer.from(hash));
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive encryption key from master key and salt
   */
  private async deriveKey(
    salt: Buffer,
    iterations: number,
    method: 'pbkdf2' | 'scrypt' = 'pbkdf2',
  ): Promise<Buffer> {
    const masterKey = this.masterKey || 'default-insecure-key';

    if (method === 'scrypt') {
      return new Promise((resolve, reject) => {
        crypto.scrypt(masterKey, salt, this.defaultKeyLength, (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });
    } else {
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(masterKey, salt, iterations, this.defaultKeyLength, 'sha256', (err, key) => {
          if (err) reject(err);
          else resolve(key);
        });
      });
    }
  }

  /**
   * Encrypt sensitive AI prompt data
   */
  async encryptPrompt(prompt: string, metadata?: Record<string, any>): Promise<EncryptedData> {
    const data = {
      prompt,
      metadata,
      timestamp: new Date().toISOString(),
    };

    return this.encrypt(data);
  }

  /**
   * Decrypt sensitive AI prompt data
   */
  async decryptPrompt(encryptedData: EncryptedData): Promise<{
    prompt: string;
    metadata?: Record<string, any>;
    timestamp: string;
  }> {
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Encrypt API keys and credentials
   */
  async encryptCredentials(credentials: Record<string, any>): Promise<EncryptedData> {
    return this.encrypt(credentials, {
      algorithm: 'aes-256-gcm',
      iterations: 150000, // Higher iterations for credentials
    });
  }

  /**
   * Decrypt API keys and credentials
   */
  async decryptCredentials(encryptedData: EncryptedData): Promise<Record<string, any>> {
    const decrypted = await this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(
    data: EncryptedData,
    newOptions?: EncryptionOptions,
  ): Promise<EncryptedData> {
    // Decrypt with old settings
    const decrypted = await this.decrypt(data);
    
    // Re-encrypt with new settings
    return this.encrypt(decrypted, newOptions);
  }

  /**
   * Check encryption health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    algorithm: string;
    keyConfigured: boolean;
  }> {
    try {
      // Test encryption/decryption
      const testData = 'health-check-' + Date.now();
      const encrypted = await this.encrypt(testData);
      const decrypted = await this.decrypt(encrypted);

      return {
        healthy: decrypted === testData,
        algorithm: this.defaultAlgorithm,
        keyConfigured: !!this.masterKey,
      };
    } catch (error) {
      this.logger.error('Encryption health check failed', error);
      return {
        healthy: false,
        algorithm: this.defaultAlgorithm,
        keyConfigured: !!this.masterKey,
      };
    }
  }
}