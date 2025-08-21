import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SocketAuthGuard implements CanActivate {
  private readonly logger = new Logger(SocketAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const payload = await this.validateToken(token);
      
      if (!payload || !payload.sub) {
        throw new WsException('Invalid token');
      }

      // Attach user info to socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.roles = payload.roles || [];

      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
      throw new WsException('Authentication failed');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try multiple sources for token
    let token = null;

    // 1. From auth object in handshake
    if (client.handshake.auth?.token) {
      token = client.handshake.auth.token;
    }
    // 2. From query parameters
    else if (client.handshake.query?.token) {
      token = client.handshake.query.token as string;
    }
    // 3. From headers (Bearer token)
    else if (client.handshake.headers?.authorization) {
      const authHeader = client.handshake.headers.authorization;
      const parts = authHeader.split(' ');
      
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    return token;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      // Check token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }

      return payload;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      return null;
    }
  }

  /**
   * Validate user has required role
   */
  static validateRole(client: Socket, requiredRole: string): boolean {
    const roles = client.data.roles || [];
    return roles.includes(requiredRole);
  }

  /**
   * Validate user has required permission
   */
  static validatePermission(client: Socket, permission: string): boolean {
    // This would check against a permission system
    // For now, simplified implementation
    const permissions = client.data.permissions || [];
    return permissions.includes(permission);
  }

  /**
   * Get user ID from socket
   */
  static getUserId(client: Socket): number | null {
    return client.data.userId || null;
  }

  /**
   * Check if user owns a resource
   */
  static async validateOwnership(
    client: Socket,
    resourceType: string,
    resourceId: string | number,
    checkOwnership: (userId: number, resourceId: string | number) => Promise<boolean>,
  ): Promise<boolean> {
    const userId = this.getUserId(client);
    
    if (!userId) {
      return false;
    }

    try {
      return await checkOwnership(userId, resourceId);
    } catch (error) {
      return false;
    }
  }
}