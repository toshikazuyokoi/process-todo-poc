import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService, AIFeatureFlagGuard } from './ai-feature-flag.guard';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'AI_FEATURE_GPT4': 'true',
                'AI_FEATURE_WEBSEARCH': 'false',
                'AI_FEATURE_REALTIME': 'true',
                'AI_FEATURE_ANALYTICS': 'false',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('isEnabled', () => {
    it('should return true for enabled features', () => {
      expect(service.isEnabled('ai_agent')).toBe(true);
      expect(service.isEnabled('template_generation')).toBe(true);
      expect(service.isEnabled('web_search')).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(service.isEnabled('advanced_analytics')).toBe(false);
      expect(service.isEnabled('experimental_models')).toBe(false);
      expect(service.isEnabled('custom_training')).toBe(false);
    });

    it('should return false for undefined features', () => {
      expect(service.isEnabled('nonexistent')).toBe(false);
    });

    it('should handle uppercase feature names', () => {
      // Note: Feature names are converted to lowercase in loadFlags
      expect(service.isEnabled('AI_AGENT')).toBe(false); // Uppercase not directly supported
      expect(service.isEnabled('ai_agent')).toBe(true);
    });
  });

  describe('getAllFlags', () => {
    it('should return all feature flags', () => {
      const flags = service.getAllFlags();
      
      expect(flags).toMatchObject({
        ai_agent: true,
        template_generation: true,
        entity_extraction: true,
        web_search: true,
        advanced_analytics: false,
        experimental_models: false,
        batch_processing: true,
        real_time_collaboration: false,
        custom_training: false,
        multi_language: false,
      });
    });
  });

  describe('setFlag', () => {
    it('should update feature flag value', () => {
      service.setFlag('advanced_analytics', true);
      expect(service.isEnabled('advanced_analytics')).toBe(true);

      service.setFlag('ai_agent', false);
      expect(service.isEnabled('ai_agent')).toBe(false);
    });

    it('should create new feature flags', () => {
      service.setFlag('newfeature', true);
      expect(service.isEnabled('newfeature')).toBe(true);
    });
  });

  describe('resetFlags', () => {
    it('should reload flags from config', () => {
      // Modify flags
      service.setFlag('ai_agent', false);
      service.setFlag('advanced_analytics', true);
      
      // Reset to original config
      service.resetFlags();
      
      expect(service.isEnabled('ai_agent')).toBe(true);
      expect(service.isEnabled('advanced_analytics')).toBe(false);
    });
  });

  describe('hasAccess', () => {
    it('should check user access with role', () => {
      expect(service.hasAccess(1, 'ai_agent', 'admin')).toBe(true);
      expect(service.hasAccess(1, 'advanced_analytics', 'user')).toBe(false);
    });

    it('should return false if feature is disabled', () => {
      expect(service.hasAccess(1, 'experimental_models', 'admin')).toBe(false);
    });
  });

  describe('userOverrides', () => {
    it('should set user-specific feature override', () => {
      service.setUserOverride(123, 'advanced_analytics', true);
      expect(service.isEnabled('advanced_analytics', 123)).toBe(true);
      expect(service.isEnabled('advanced_analytics', 456)).toBe(false);
    });

    it('should remove user override', () => {
      service.setUserOverride(123, 'advanced_analytics', true);
      service.removeUserOverride(123, 'advanced_analytics');
      expect(service.isEnabled('advanced_analytics', 123)).toBe(false);
    });

    it('should get all user flags', () => {
      service.setUserOverride(123, 'advanced_analytics', true);
      service.setUserOverride(123, 'experimental_models', true);
      
      const userFlags = service.getUserFlags(123);
      expect(userFlags).toMatchObject({
        advanced_analytics: true,
        experimental_models: true,
      });
    });
  });

  describe('updateFlags', () => {
    it('should update multiple flags at once', () => {
      service.updateFlags({
        ai_agent: false,
        web_search: false,
        newfeature: true,
      });

      expect(service.isEnabled('ai_agent')).toBe(false);
      expect(service.isEnabled('web_search')).toBe(false);
      expect(service.isEnabled('newfeature')).toBe(true);
    });
  });
});

describe('AIFeatureFlagGuard', () => {
  let guard: AIFeatureFlagGuard;
  let reflector: Reflector;
  let featureFlagService: FeatureFlagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIFeatureFlagGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: FeatureFlagService,
          useValue: {
            isEnabled: jest.fn(),
            hasAccess: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AIFeatureFlagGuard>(AIFeatureFlagGuard);
    reflector = module.get<Reflector>(Reflector);
    featureFlagService = module.get<FeatureFlagService>(FeatureFlagService);
  });

  describe('canActivate', () => {
    let context: ExecutionContext;

    beforeEach(() => {
      context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn().mockReturnValue('http'),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
        }),
      } as any;
    });

    it('should allow access when no feature flag is required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access when single feature is enabled', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipFeatureFlag
        .mockReturnValueOnce({ flag: 'ai_agent' }); // options
      jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(true);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('ai_agent', undefined);
    });

    it('should deny access when single feature is disabled', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipFeatureFlag
        .mockReturnValueOnce({ flag: 'experimental_models' }); // options
      jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow();
      expect(featureFlagService.isEnabled).toHaveBeenCalledWith('experimental_models', undefined);
    });

    it('should check user access when userId is present', async () => {
      const request = { user: { id: 123, role: 'admin' } };
      context.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      });

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipFeatureFlag
        .mockReturnValueOnce({
          flag: 'ai_agent',
          checkUserPermission: (user: any) => true,
        }); // options
      jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(true);
      jest.spyOn(featureFlagService, 'hasAccess').mockReturnValue(true);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(featureFlagService.hasAccess).toHaveBeenCalledWith(123, 'ai_agent', 'admin');
    });

    it('should deny access when user lacks permission', async () => {
      const request = { user: { id: 123, role: 'user' } };
      context.switchToHttp = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      });

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(false) // skipFeatureFlag
        .mockReturnValueOnce({
          flag: 'custom_training',
          checkUserPermission: (user: any) => false,
        }); // options
      jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(true);
      jest.spyOn(featureFlagService, 'hasAccess').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow();
    });

    it('should skip when skip flag is set', async () => {
      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true) // skipFeatureFlag
        .mockReturnValueOnce(undefined); // options

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should check both handler and class metadata', async () => {
      const getHandler = jest.fn();
      const getClass = jest.fn();
      context.getHandler = getHandler;
      context.getClass = getClass;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        'skipFeatureFlag',
        [getHandler(), getClass()]
      );
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        'featureFlag',
        [getHandler(), getClass()]
      );
    });
  });
});