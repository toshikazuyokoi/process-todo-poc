import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<User>;
}

@Injectable()
export class AuthService {
  private prisma: PrismaClient;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.prisma = new PrismaClient();
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !user.isActive) {
      return null;
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked. Please try again later.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.handleFailedLogin(user.id);
      return null;
    }

    // Reset failed login attempts on successful login
    await this.handleSuccessfulLogin(user.id);
    
    return user;
  }

  async login(user: User): Promise<AuthResponse> {
    const payload: JwtPayload = { 
      sub: user.id, 
      email: user.email,
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async signup(signupDto: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    if (signupDto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        password: hashedPassword,
        name: signupDto.name,
        role: 'member',
        isActive: true,
        emailVerified: false,
      },
    });

    // Create default organization and team for the user
    const organization = await this.prisma.organization.create({
      data: {
        name: `${signupDto.name}'s Organization`,
        slug: `org-${user.id}-${Date.now()}`,
        plan: 'free',
      },
    });

    const team = await this.prisma.team.create({
      data: {
        organizationId: organization.id,
        name: 'Default Team',
        description: 'Default team for new users',
      },
    });

    // Add user to team
    await this.prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: team.id,
      },
    });

    // Assign default role
    const memberRole = await this.prisma.role.findFirst({
      where: { name: 'member' },
    });

    if (memberRole) {
      await this.prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: memberRole.id,
          teamId: team.id,
        },
      });
    }

    return this.login(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verify refresh token exists and is valid
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens
    return this.login(tokenRecord.user);
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    // Revoke refresh token if provided
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { 
          token: refreshToken,
          userId: userId,
        },
        data: { revokedAt: new Date() },
      });
    }

    // Optionally revoke all refresh tokens for the user
    // await this.prisma.refreshToken.updateMany({
    //   where: { userId: userId },
    //   data: { revokedAt: new Date() },
    // });
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  private async handleFailedLogin(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: any = {
      failedLoginAttempts: failedAttempts,
    };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 30); // Lock for 30 minutes
      updateData.lockedUntil = lockedUntil;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  private async handleSuccessfulLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId: userId },
      data: { revokedAt: new Date() },
    });
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    return this.usersService.findById(payload.sub);
  }
}