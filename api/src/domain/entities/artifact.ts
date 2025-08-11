export class Artifact {
  constructor(
    private readonly id: number | null,
    private readonly stepId: number,
    private kind: string,
    private fileName: string,
    private fileSize: number,
    private mimeType: string,
    private s3Key: string,
    private required: boolean,
    private uploadedBy: number | null,
    private uploadedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): number | null {
    return this.id;
  }

  getStepId(): number {
    return this.stepId;
  }

  getKind(): string {
    return this.kind;
  }

  getS3Key(): string {
    return this.s3Key;
  }

  isRequired(): boolean {
    return this.required;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateKind(kind: string): void {
    if (!kind || kind.trim().length === 0) {
      throw new Error('Artifact kind cannot be empty');
    }
    this.kind = kind;
    this.updatedAt = new Date();
  }

  updateS3Key(s3Key: string): void {
    if (!s3Key || s3Key.trim().length === 0) {
      throw new Error('S3 key cannot be empty');
    }
    this.s3Key = s3Key;
    this.updatedAt = new Date();
  }

  markAsRequired(): void {
    this.required = true;
    this.updatedAt = new Date();
  }

  markAsOptional(): void {
    this.required = false;
    this.updatedAt = new Date();
  }

  getFileExtension(): string {
    const parts = this.s3Key.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  getFileName(): string {
    return this.fileName;
  }

  getFileSize(): number {
    return this.fileSize;
  }

  getMimeType(): string {
    return this.mimeType;
  }

  getUploadedBy(): number | null {
    return this.uploadedBy;
  }

  getUploadedAt(): Date | null {
    return this.uploadedAt;
  }

  setUploadInfo(uploadedBy: number, uploadedAt: Date): void {
    this.uploadedBy = uploadedBy;
    this.uploadedAt = uploadedAt;
    this.updatedAt = new Date();
  }

  getFileSizeInMB(): number {
    return this.fileSize / (1024 * 1024);
  }

  isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  isPDF(): boolean {
    return this.mimeType === 'application/pdf';
  }

  isDocument(): boolean {
    const docTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];
    return docTypes.includes(this.mimeType) || this.isPDF();
  }
}