import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  key: string;
  url: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // For MVP, we'll use local file storage
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
    this.baseUrl = this.configService.get<string>('BASE_URL') || 'http://localhost:3005';
    
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'artifacts',
  ): Promise<FileUploadResult> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = `${folder}/${fileName}`;
    const filePath = path.join(this.uploadDir, key);

    // Ensure folder exists
    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Save file
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      key,
      url: `${this.baseUrl}/uploads/${key}`,
      size: file.size,
    };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async getFileStream(key: string): Promise<fs.ReadStream> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    return fs.createReadStream(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key);
    return fs.existsSync(filePath);
  }

  getFileUrl(key: string): string {
    return `${this.baseUrl}/uploads/${key}`;
  }
}