import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';

// Mock JwtAuthGuard for testing
export class MockJwtAuthGuard extends JwtAuthGuard {
  static mockUserId = 1; // Can be overridden in tests
  
  canActivate(context: ExecutionContext): boolean {
    // Get the request object
    const request = context.switchToHttp().getRequest();
    
    // Set a mock user on the request
    request.user = {
      id: MockJwtAuthGuard.mockUserId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
    };
    
    return true;
  }
}

// Function to override guards in testing module
export function overrideAuthGuards(moduleBuilder: any) {
  return moduleBuilder
    .overrideGuard(JwtAuthGuard)
    .useClass(MockJwtAuthGuard);
}