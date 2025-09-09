import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

export const FEATURE_FLAG_KEY = 'featureFlag';
export const SKIP_FEATURE_FLAG_KEY = 'skipFeatureFlag';

export interface FeatureFlagOptions {
  flag: string;
  defaultValue?: boolean;
  errorMessage?: string;
  checkUserPermission?: (user: any) => boolean;
}

/**
 * Feature Flag Service
 * Manages feature flags for AI functionality
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  private readonly flags: Map<string, boolean> = new Map();
  private readonly userOverrides: Map<string, Map<string, boolean>> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.loadFlags();
  }

  /**
   * Load feature flags from configuration
   */
  private loadFlags(): void {
    // Load from environment variables with AI_FEATURE_ prefix
    const envFlags = process.env;
    for (const key in envFlags) {
      if (key.startsWith('AI_FEATURE_')) {
        const flagName = key.replace('AI_FEATURE_', '').toLowerCase();
        this.flags.set(flagName, envFlags[key] === 'true');
      }
    }

    // Default flags
    const defaultFlags = {
      'ai_agent': true,
      // Keep both keys for compatibility. Controller uses 'ai_template_generation'.
      'ai_template_generation': true,
      'template_generation': true,
      'entity_extraction': true,
      'web_search': true,
      'advanced_analytics': false,
      'experimental_models': false,
      'batch_processing': true,
      'real_time_collaboration': false,
      'custom_training': false,
      'multi_language': false,
    };

    for (const [flag, value] of Object.entries(defaultFlags)) {
      if (!this.flags.has(flag)) {
        this.flags.set(flag, value);
      }
    }

    this.logger.log(`Loaded ${this.flags.size} feature flags`);
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: string, userId?: number): boolean {
    // Check user-specific override first
    if (userId) {
      const userKey = `user-${userId}`;
      const userFlags = this.userOverrides.get(userKey);
      if (userFlags?.has(flag)) {
        return userFlags.get(flag)!;
      }
    }

    // Check global flag
    return this.flags.get(flag) ?? false;
  }

  /**
   * Set a feature flag
   */
  setFlag(flag: string, enabled: boolean): void {
    this.flags.set(flag, enabled);
    this.logger.log(`Feature flag '${flag}' set to ${enabled}`);
  }

  /**
   * Set user-specific feature flag override
   */
  setUserOverride(userId: number, flag: string, enabled: boolean): void {
    const userKey = `user-${userId}`;
    
    if (!this.userOverrides.has(userKey)) {
      this.userOverrides.set(userKey, new Map());
    }
    
    this.userOverrides.get(userKey)!.set(flag, enabled);
    this.logger.log(`User ${userId} override for '${flag}' set to ${enabled}`);
  }

  /**
   * Remove user-specific override
   */
  removeUserOverride(userId: number, flag?: string): void {
    const userKey = `user-${userId}`;
    
    if (flag) {
      this.userOverrides.get(userKey)?.delete(flag);
    } else {
      this.userOverrides.delete(userKey);
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    
    for (const [flag, enabled] of this.flags.entries()) {
      result[flag] = enabled;
    }
    
    return result;
  }

  /**
   * Get user-specific flags (including overrides)
   */
  getUserFlags(userId: number): Record<string, boolean> {
    const result = this.getAllFlags();
    const userKey = `user-${userId}`;
    const userFlags = this.userOverrides.get(userKey);
    
    if (userFlags) {
      for (const [flag, enabled] of userFlags.entries()) {
        result[flag] = enabled;
      }
    }
    
    return result;
  }

  /**
   * Check if user has access to a feature
   */
  hasAccess(userId: number, flag: string, userRole?: string): boolean {
    // Check if feature is enabled
    if (!this.isEnabled(flag, userId)) {
      return false;
    }

    // Additional role-based checks
    const restrictedFeatures: Record<string, string[]> = {
      'custom_training': ['admin', 'developer'],
      'experimental_models': ['admin', 'beta_tester'],
      'advanced_analytics': ['admin', 'analyst', 'premium'],
    };

    const requiredRoles = restrictedFeatures[flag];
    if (requiredRoles && userRole) {
      return requiredRoles.includes(userRole);
    }

    return true;
  }

  /**
   * Bulk update flags
   */
  updateFlags(flags: Record<string, boolean>): void {
    for (const [flag, enabled] of Object.entries(flags)) {
      this.setFlag(flag, enabled);
    }
  }

  /**
   * Reset flags to defaults
   */
  resetFlags(): void {
    this.flags.clear();
    this.userOverrides.clear();
    this.loadFlags();
  }
}

/**
 * AI Feature Flag Guard
 * Checks if AI features are enabled before allowing access
 */
@Injectable()
export class AIFeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(AIFeatureFlagGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if feature flag check should be skipped
    const skipFeatureFlag = this.reflector.getAllAndOverride<boolean>(
      SKIP_FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipFeatureFlag) {
      return true;
    }

    // Get feature flag options from decorator
    const options = this.reflector.getAllAndOverride<FeatureFlagOptions>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip if no feature flag is configured
    if (!options) {
      return true;
    }

    // Get user from request
    const request = this.getRequest(context);
    const user = request?.user;
    const userId = user?.id || user?.userId;

    // Check if feature is enabled
    const isEnabled = this.featureFlagService.isEnabled(options.flag, userId);

    if (!isEnabled) {
      // Check if default value allows access
      if (options.defaultValue) {
        this.logger.debug(`Feature '${options.flag}' disabled, using default value: true`);
        return true;
      }

      // Check user-specific permission
      if (options.checkUserPermission && user) {
        const hasPermission = options.checkUserPermission(user);
        if (hasPermission) {
          this.logger.debug(`User ${userId} has permission for disabled feature '${options.flag}'`);
          return true;
        }
      }

      const errorMessage = options.errorMessage || 
        `Feature '${options.flag}' is not enabled`;

      this.logger.warn(`Access denied: ${errorMessage} for user ${userId}`);

      throw new ForbiddenException({
        statusCode: 403,
        message: errorMessage,
        error: 'Forbidden',
        feature: options.flag,
      });
    }

    // Additional role-based check
    const userRole = user?.role;
    if (userId && userRole) {
      const hasAccess = this.featureFlagService.hasAccess(userId, options.flag, userRole);
      
      if (!hasAccess) {
        const errorMessage = `User does not have required role for feature '${options.flag}'`;
        
        this.logger.warn(`Access denied: ${errorMessage} for user ${userId}`);
        
        throw new ForbiddenException({
          statusCode: 403,
          message: errorMessage,
          error: 'Forbidden',
          feature: options.flag,
        });
      }
    }

    this.logger.debug(`Feature '${options.flag}' enabled for user ${userId}`);
    return true;
  }

  /**
   * Get request object from context
   */
  private getRequest(context: ExecutionContext): any {
    const type = context.getType();

    if (type === 'http') {
      return context.switchToHttp().getRequest();
    }

    if (type === 'ws') {
      return context.switchToWs().getClient().handshake;
    }

    if (type === 'rpc') {
      return context.switchToRpc().getContext();
    }

    return null;
  }
}

/**
 * Feature flag decorator
 */
export function FeatureFlag(flagOrOptions: string | FeatureFlagOptions) {
  const options: FeatureFlagOptions = 
    typeof flagOrOptions === 'string' 
      ? { flag: flagOrOptions }
      : flagOrOptions;

  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata(FEATURE_FLAG_KEY, options, descriptor!.value);
      return descriptor;
    } else {
      // Class decorator
      Reflect.defineMetadata(FEATURE_FLAG_KEY, options, target);
      return target;
    }
  };
}

/**
 * Skip feature flag decorator
 */
export function SkipFeatureFlag() {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey) {
      // Method decorator
      Reflect.defineMetadata(SKIP_FEATURE_FLAG_KEY, true, descriptor!.value);
      return descriptor;
    } else {
      // Class decorator
      Reflect.defineMetadata(SKIP_FEATURE_FLAG_KEY, true, target);
      return target;
    }
  };
}