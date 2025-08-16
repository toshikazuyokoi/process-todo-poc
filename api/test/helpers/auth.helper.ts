import { JwtService } from '@nestjs/jwt';

export class AuthTestHelper {
  static createTestToken(userId: number = 1, role: string = 'member'): string {
    const jwtService = new JwtService({
      secret: 'test-secret',
      signOptions: { expiresIn: '1h' },
    });

    return jwtService.sign({
      sub: userId,
      email: 'test@example.com',
      role: role,
    });
  }

  static getAuthHeader(token?: string): { Authorization: string } {
    const authToken = token || AuthTestHelper.createTestToken();
    return { Authorization: `Bearer ${authToken}` };
  }
}