import { Controller, Post, Delete, Body, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@infrastructure/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * E2Eテスト専用のエンドポイント
 * 本番環境では無効化される
 */
@ApiTags('Test')
@Controller('test')
export class TestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  /**
   * テストユーザーのセットアップ
   */
  @Post('setup')
  @ApiOperation({ summary: 'Setup test user for E2E tests' })
  @ApiResponse({ status: 200, description: 'Test user created or already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden in production environment' })
  async setupTestUser(@Body() dto: {
    email: string;
    password: string;
    name?: string;
    role?: string;
  }) {
    // 環境チェック（開発/テスト環境のみ許可）
    const allowedEnvs = ['test', 'development', 'e2e'];
    const currentEnv = this.configService.get<string>('NODE_ENV');
    
    if (!allowedEnvs.includes(currentEnv)) {
      throw new ForbiddenException('Test endpoints only available in test/development environment');
    }

    // 必須パラメータのチェック
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    try {
      // 既存ユーザーをチェック
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });

      if (existing) {
        console.log(`Test user ${dto.email} already exists`);
        return { 
          message: 'Test user already exists',
          userId: existing.id 
        };
      }

      // パスワードのハッシュ化
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // テストユーザー作成
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role || 'viewer',
          name: dto.name || 'Test User'
        }
      });

      console.log(`Test user ${dto.email} created with ID: ${user.id}`);

      return { 
        message: 'Test user created',
        userId: user.id 
      };

    } catch (error) {
      console.error('Error creating test user:', error);
      throw new BadRequestException('Failed to create test user');
    }
  }

  /**
   * テストデータのクリーンアップ
   */
  @Delete('cleanup')
  @ApiOperation({ summary: 'Cleanup test data after E2E tests' })
  @ApiResponse({ status: 200, description: 'Test data cleaned up' })
  @ApiResponse({ status: 403, description: 'Forbidden in production environment' })
  async cleanupTestData(@Body() dto: { email: string }) {
    // 環境チェック
    const allowedEnvs = ['test', 'development', 'e2e'];
    const currentEnv = this.configService.get<string>('NODE_ENV');
    
    if (!allowedEnvs.includes(currentEnv)) {
      throw new ForbiddenException('Test endpoints only available in test/development environment');
    }

    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    try {
      // テストユーザーを検索
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email }
      });

      if (!user) {
        console.log(`Test user ${dto.email} not found`);
        return { message: 'Test user not found' };
      }

      // 関連データの削除（カスケード削除が設定されていない場合）
      // Note: 順序は外部キー制約を考慮
      
      // コメントの削除
      await this.prisma.comment.deleteMany({
        where: { createdBy: user.id }
      });

      // ケースステップの削除
      const cases = await this.prisma.processCase.findMany({
        where: { createdBy: user.id },
        select: { id: true }
      });
      
      for (const caseItem of cases) {
        await this.prisma.caseStep.deleteMany({
          where: { caseId: caseItem.id }
        });
      }

      // ケースの削除
      await this.prisma.processCase.deleteMany({
        where: { createdBy: user.id }
      });

      // テンプレートステップの削除
      const templates = await this.prisma.processTemplate.findMany({
        where: { createdBy: user.id },
        select: { id: true }
      });
      
      for (const template of templates) {
        await this.prisma.templateStep.deleteMany({
          where: { templateId: template.id }
        });
      }

      // テンプレートの削除
      await this.prisma.processTemplate.deleteMany({
        where: { createdBy: user.id }
      });

      // ユーザーの削除
      await this.prisma.user.delete({
        where: { id: user.id }
      });

      console.log(`Test user ${dto.email} and related data cleaned up`);

      return { 
        message: 'Test data cleaned up',
        deletedUserId: user.id 
      };

    } catch (error) {
      console.error('Error cleaning up test data:', error);
      // クリーンアップエラーは警告のみにして処理を続行
      return { 
        message: 'Partial cleanup completed',
        error: error.message 
      };
    }
  }
}